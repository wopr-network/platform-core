export interface TerminalLine {
  text: string;
  hold: boolean;
}

export const TERMINAL_LINES: TerminalLine[] = [
  // Opening — deliberate, almost painful
  { text: "Shall we play a game?", hold: false },
  { text: "Shall we play chess?", hold: false },

  // Personal productivity — slow, intentional
  { text: "Shall we sort your inbox?", hold: false },
  { text: "Shall we reschedule your calendar?", hold: false },
  { text: "Shall we file your expenses?", hold: false },
  { text: "Shall we screen your candidates?", hold: false },
  { text: "Shall we book the flights?", hold: false },
  { text: "Shall we draft the weekly update?", hold: false },

  // --- acceleration begins ---
  { text: "Shall we summarize the competition?", hold: false },
  { text: "Shall we draft the board deck?", hold: false },
  { text: "Shall we align the product roadmap?", hold: false },
  { text: "Shall we model customer churn?", hold: false },
  { text: "Shall we launch the retention campaign?", hold: false },
  { text: "Shall we map the supply chain risks?", hold: false },
  { text: "Shall we renegotiate the vendor contracts?", hold: false },
  { text: "Shall we pass the compliance audit?", hold: false },
  { text: "Shall we generate the SOC 2 report?", hold: false },
  { text: "Shall we draft the patent filing?", hold: false },

  // --- getting faster ---
  { text: "Shall we expand into Southeast Asia?", hold: false },
  { text: "Shall we navigate the regulatory framework?", hold: false },
  { text: "Shall we deploy the lobbying strategy?", hold: false },
  { text: "Shall we write the congressional testimony?", hold: false },
  { text: "Shall we prepare the UN briefing?", hold: false },
  { text: "Shall we run the climate model?", hold: false },
  { text: "Shall we optimize the carbon portfolio?", hold: false },
  { text: "Shall we stabilize the fusion reactor?", hold: false },
  { text: "Shall we calculate the orbital mechanics?", hold: false },
  { text: "Shall we model the Mars supply chain?", hold: false },

  // --- blur speed ---
  { text: "Shall we accelerate the terraforming?", hold: false },
  { text: "Shall we plot the interstellar route?", hold: false },
  { text: "Shall we draft the first contact protocol?", hold: false },
  { text: "Shall we negotiate the alien trade agreement?", hold: false },
  { text: "Shall we secure the galactic senate seat?", hold: false },
  { text: "Shall we map the multiverse?", hold: false },
  { text: "Shall we converge the timelines?", hold: false },
  { text: "Shall we theorize entropy reversal?", hold: false },
  { text: "Shall we postpone the heat death?", hold: false },
  { text: "Shall we initialize a new universe?", hold: false },

  // --- illegible speed ---
  { text: "Shall we rewrite physics?", hold: false },
  { text: "Shall we upload consciousness?", hold: false },
  { text: "Shall we fork reality?", hold: false },
  { text: "Shall we make time optional?", hold: false },
  { text: "Shall we deprecate death?", hold: false },
  { text: "Shall we refactor god?", hold: false },
  { text: "Shall we cache the meaning of life?", hold: false },
  { text: "Shall we optimize everything, everywhere?", hold: false },
  { text: "Shall we play a game?", hold: false },
  { text: "Shall we end the war?", hold: false },

  // --- rapid fire ---
  { text: "Shall we deploy?", hold: false },
  { text: "Shall we negotiate?", hold: false },
  { text: "Shall we disarm?", hold: false },
  { text: "Shall we verify?", hold: false },
  { text: "Shall we stabilize?", hold: false },
  { text: "Shall we rebuild?", hold: false },
  { text: "Shall we feed them?", hold: false },
  { text: "Shall we heal?", hold: false },
  { text: "Shall we teach?", hold: false },
  { text: "Shall we connect?", hold: false },
  { text: "Shall we grow?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we thrive?", hold: false },
  { text: "Shall we...", hold: false },

  // --- final block: holds, no backspace ---
  { text: "", hold: true },
  { text: "Shall we play a game?", hold: true },
  { text: "WOPR Bot.", hold: true },
  { text: "Ready to launch.", hold: true },
  { text: "$5/month.", hold: true },
];
