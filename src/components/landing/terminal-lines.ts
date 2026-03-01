export interface TerminalLine {
  text: string;
  hold: boolean;
}

export const TERMINAL_LINES: TerminalLine[] = [
  // Opening — the WarGames reference
  { text: "Shall we play a game?", hold: false },
  { text: "Shall we play chess?", hold: false },

  // The small stuff — slow, painfully relatable
  { text: "Shall we sort your inbox?", hold: false },
  { text: "Shall we call your mom?", hold: false },
  { text: "Shall we visit home?", hold: false },
  { text: "Shall we make the appointment?", hold: false },
  { text: "Shall we find the charger?", hold: false },
  { text: "Shall we finally text back?", hold: false },
  { text: "Shall we say yes?", hold: false },
  { text: "Shall we meal prep Sunday?", hold: false },
  { text: "Shall we fix the leak?", hold: false },
  { text: "Shall we pull the all-nighter?", hold: false },

  // Getting ahead
  { text: "Shall we prove ourselves?", hold: false },
  { text: "Shall we ask for the raise?", hold: false },
  { text: "Shall we make it to Friday?", hold: false },
  { text: "Shall we pay off the card?", hold: false },
  { text: "Shall we take the leap?", hold: false },
  { text: "Shall we quit the day job?", hold: false },
  { text: "Shall we move out?", hold: false },

  // Getting rich
  { text: "Shall we start the company?", hold: false },
  { text: "Shall we build the thing?", hold: false },
  { text: "Shall we make payroll?", hold: false },
  { text: "Shall we find the co-founder?", hold: false },
  { text: "Shall we walk into the room?", hold: false },
  { text: "Shall we raise the round?", hold: false },
  { text: "Shall we close the deal?", hold: false },
  { text: "Shall we make it?", hold: false },
  { text: "Shall we make the first million?", hold: false },
  { text: "Shall we call home?", hold: false },

  // The dream
  { text: "Shall we write the great American novel?", hold: false },
  { text: "Shall we stay up writing?", hold: false },
  { text: "Shall we finish the screenplay?", hold: false },
  { text: "Shall we record the album?", hold: false },
  { text: "Shall we get the gallery show?", hold: false },
  { text: "Shall we make an offer?", hold: false },
  { text: "Shall we buy the house?", hold: false },
  { text: "Shall we say the thing?", hold: false },
  { text: "Shall we ask her out?", hold: false },
  { text: "Shall we say I do?", hold: false },
  { text: "Shall we plan the wedding?", hold: false },

  // Political ambition
  { text: "Shall we knock on every door?", hold: false },
  { text: "Shall we run for city council?", hold: false },
  { text: "Shall we give the speech?", hold: false },
  { text: "Shall we win the primary?", hold: false },
  { text: "Shall we run for congress?", hold: false },
  { text: "Shall we flip the district?", hold: false },
  { text: "Shall we take the Senate seat?", hold: false },
  { text: "Shall we go all in?", hold: false },
  { text: "Shall we run for president?", hold: false },
  { text: "Shall we take the oath?", hold: false },
  { text: "Shall we remember this?", hold: false },

  // Cosmic
  { text: "Shall we land on Mars?", hold: false },
  { text: "Shall we plant the flag?", hold: false },
  { text: "Shall we conquer Venus?", hold: false },
  { text: "Shall we claim the asteroid belt?", hold: false },
  { text: "Shall we terraform the red planet?", hold: false },
  { text: "Shall we reach Alpha Centauri?", hold: false },
  { text: "Shall we name the new worlds?", hold: false },
  { text: "Shall we seed the galaxy?", hold: false },
  { text: "Shall we map the dark matter?", hold: false },
  { text: "Shall we rewrite the laws of physics?", hold: false },
  { text: "Shall we postpone the heat death?", hold: false },
  { text: "Shall we initialize a new universe?", hold: false },

  // --- rapid fire / illegible ---
  { text: "Shall we win?", hold: false },
  { text: "Shall we create?", hold: false },
  { text: "Shall we build?", hold: false },
  { text: "Shall we lead?", hold: false },
  { text: "Shall we love?", hold: false },
  { text: "Shall we live?", hold: false },
  { text: "Shall we give?", hold: false },
  { text: "Shall we dare?", hold: false },
  { text: "Shall we stay?", hold: false },
  { text: "Shall we go?", hold: false },
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
  { text: "Shall we rule the universe?", hold: true },
  { text: "WOPR Bot.", hold: true },
  { text: "Ready to launch.", hold: true },
  { text: "$5/month.", hold: true },
];
