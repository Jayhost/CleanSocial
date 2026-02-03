#!/bin/bash
cd /home/ian/social-dashboard
# Load your profile to make sure npm is found
source ~/.bashrc
npm start
# Keep the window open so you can see why it failed
echo "-------------------"
echo "If you see an error above, fix it and try again."
echo "Press Enter to close this window."
read