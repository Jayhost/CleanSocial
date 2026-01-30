// This runs INSIDE the Twitter/Instagram page
window.addEventListener('DOMContentLoaded', () => {
    
    const style = document.createElement('style');
    style.innerHTML = `
      /* CSS Blocking is faster than JS blocking */
      [aria-label="Grok"], 
      [aria-label="Subscribe to Premium"],
      a[href*="/analytics"],
      div[data-testid="trend"] { 
         display: none !important; 
      }
    `;
    document.head.appendChild(style);

    // JS Blocking for complex stuff (like specific text keywords)
    const observer = new MutationObserver(() => {
       const tweets = document.querySelectorAll('article');
       tweets.forEach(t => {
           if(t.innerText.includes("Promoted")) t.style.display = 'none';
           if(t.innerText.includes("Grok")) t.style.display = 'none';
       });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});