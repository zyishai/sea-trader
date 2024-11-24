<pre style="color:green;background:transparent">
███████ ███████  █████      ████████ ██████   █████  ██████  ███████ ██████  
██      ██      ██   ██        ██    ██   ██ ██   ██ ██   ██ ██      ██   ██ 
███████ █████   ███████        ██    ██████  ███████ ██   ██ █████   ██████  
     ██ ██      ██   ██        ██    ██   ██ ██   ██ ██   ██ ██      ██   ██ 
███████ ███████ ██   ██        ██    ██   ██ ██   ██ ██████  ███████ ██   ██ 
</pre>

<img src="./screenshot.png" alt="Screenshot of the game in Warp terminal" />

# Overview
Sea Trader is a terminal-based trading simulation game set in the 19th-century Far East. As a maritime merchant, your goal is to amass a fortune of $25,000 within 100 days through strategic 
trading, careful navigation, and shrewd decision-making.

# Quick Start
```bash
$ npx ctrader
```

> Tested on: *iTerm version 3.5.10* and *Warp version 2024.11.21*.

# How to Play
On the start screen, you can toggle between "Regular" and "Extended" game modes by pressing the `M` key. Press Enter to begin your journey.

## Game Modes
- **Regular:** Default mode with a 100-day limit for your voyage.
- **Extended:** Continue playing beyond 100 days, but incur score penalties for each extra day.

## Available commands
- **Travel:** Move between ports. Type the number next to your desired destination and press Enter to confirm. Each travel takes 3-10 days.
- **Buy/Sell:** Purchase or sell goods from the local market. Type the initial of the good and how many tons you'd like to buy/sell, then press Enter to confirm.
- **Repair:** Available only if your ship is damaged. Enter the amount of money you wish to invest in repairs and press Enter to confirm.
- **Retire:** This option is available only after 100 days. End the game and display your score.

## Scoring
Your score is influenced by the following factors:  
1. Total wealth accumulated.
1. Condition and upgrades of your ship.
1. Number of days taken to reach your goal (extra days incur penalties).

## Gameplay Tips
- Keep an eye on the price list. Prices are updated every 14 days.
- Maintain your ship in good condition to avoid negatively impacting your final score.
- Plan efficient routes to maximize trading time and opportunities.
- Events are more likely to occur during the late stages of your voyage and as you get richer.

# Feedback and Contributions
Your feedback is very appreciated! Please let me know if you want something new implemented or if you have an idea for improving the gameplay.  
If you want to contribute code, please open an issue describing your change and let the community discuss your idea before implementing it. Thank you!

# License
MIT
