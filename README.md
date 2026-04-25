# cinevocab
HBO Max's subtitle DOM selectors can change when they push updates. If the button clicks but nothing saves, open the browser DevTools (F12), inspect the subtitle text on screen, and find its class name — then add it to the SUBTITLE_SELECTORS array in content_script.js. I've already included the most common ones but HBO occasionally shuffles them.


