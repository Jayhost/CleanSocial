#!/usr/bin/env python3
import requests
import re
import sys
import json
import time
from pathlib import Path

# --- CONFIG ---
PORT_DRAFTER = 8081  # CPU
PORT_REVIEWER = 8080 # GPU

# Increase timeout to 120s. 30B models are heavy and take time to "wake up".
TIMEOUT = 120 

# --- GRAMMAR ---
SED_GRAMMAR = r"""
root   ::= (edits)*
edits  ::= "s/" old "/" new "/\n"
old    ::= [^\n/]+
new    ::= [^\n/]+
"""

def clean_code(text):
    match = re.search(r'```(?:python)?\n(.*?)```', text, re.DOTALL)
    if match: return match.group(1).strip()
    return text.replace("```python", "").replace("```", "").strip()

def stream_request(name, url, payload):
    print(f"\n[{name}] Connecting...", end=" ", flush=True)
    
    start_time = time.time()
    first_token_time = None
    token_count = 0
    full_text = ""
    
    try:
        # TIMEOUT increased to avoid crashing on slow prompt processing
        with requests.post(url, json=payload, stream=True, timeout=TIMEOUT) as r:
            r.raise_for_status()
            
            for line in r.iter_lines():
                if line:
                    decoded = line.decode('utf-8').replace('data: ', '')
                    if decoded == '[DONE]': break
                    try:
                        chunk = json.loads(decoded)
                        
                        # Handle different API formats (Chat vs Completion)
                        if 'choices' in chunk:
                            delta = chunk['choices'][0]['delta'].get('content', '')
                        else:
                            delta = chunk.get('content', '')

                        if delta:
                            # Record TTFT (Time To First Token)
                            if first_token_time is None:
                                first_token_time = time.time()
                                ttft = first_token_time - start_time
                                print(f"Connected! (TTFT: {ttft:.2f}s)\n")
                                print(f"[{name}] Output: ", end="", flush=True)

                            print(delta, end="", flush=True)
                            full_text += delta
                            token_count += 1
                    except:
                        pass
    except Exception as e:
        print(f"\n\n❌ Connection Error: {e}")
        return ""

    end_time = time.time()
    
    # --- BENCHMARK REPORT ---
    total_time = end_time - start_time
    gen_time = end_time - (first_token_time or start_time)
    tps = token_count / gen_time if gen_time > 0 else 0
    
    print(f"\n\n📊 {name} STATS:")
    print(f"   - Total Time:   {total_time:.2f}s")
    print(f"   - Latency (TTFT): {0 if not first_token_time else first_token_time - start_time:.2f}s (Time spent reading prompt)")
    print(f"   - Gen Speed:    {tps:.2f} tokens/sec")
    print(f"   - Total Tokens: {token_count}")
    
    return full_text

def main():
    print("=== BENCHMARK REVISION AGENT ===\n")

    # 1. DRAFT
    task = "Write a Python script that asks for a name and prints 'Hello'. INTENTIONAL BUG: Use 'pritn' instead of 'print'."
    
    draft_payload = {
        "messages": [
            {"role": "system", "content": "You are a coding engine. Output code only."},
            {"role": "user", "content": task}
        ],
        "max_tokens": 1000,
        "temperature": 0.1,
        "stream": True
    }
    
    raw_draft = stream_request(
        "DRAFTER (CPU)", 
        f"http://127.0.0.1:{PORT_DRAFTER}/v1/chat/completions", 
        draft_payload
    )
    
    draft_code = clean_code(raw_draft)
    if not draft_code: return

    # 2. REVIEW
    review_prompt = f"""<|im_start|>system
You are a code fixer. 
If logic errors exist, output replacements using: s/old code/new code/
If no errors, output nothing.
<|im_end|>
<|im_start|>user
{draft_code}
<|im_end|>
<|im_start|>assistant
"""
    
    review_payload = {
        "prompt": review_prompt,
        "grammar": SED_GRAMMAR,
        "n_predict": 500,
        "temperature": 0.0,
        "stream": True,
        "cache_prompt": True # Try to cache the system prompt
    }

    patches = stream_request(
        "REVIEWER (GPU)", 
        f"http://127.0.0.1:{PORT_REVIEWER}/completion", 
        review_payload
    )

    # 3. PATCH
    if patches:
        ops = re.findall(r"s/(.*?)/(.*?)/", patches)
        if ops:
            final = draft_code
            for old, new in ops:
                final = final.replace(old, new, 1)
            print(f"\n✅ Fixed Code:\n{final}")
        else:
            print("\n⚠️ Patches generated but regex failed to parse.")
    else:
        print("\n✅ No issues found.")

if __name__ == "__main__":
    main()