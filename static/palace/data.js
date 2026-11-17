/* Memory Palace: the routes (palaces) and the ready-made lists. Each route has 15 places in a fixed order,
   each one easy to tell apart. A list item: text (what to remember), key (e.g. "IFRS 9": also accepted as an
   answer), emoji (shown to children and in the 3D walk), image (a vivid picture to imagine for it). */
"use strict";
const PalaceData = (() => {
  // places on a 100 x 70 map; the route snakes through three rows of five
  const at = (i) => { const row = Math.floor(i / 5), col = i % 5; return [12 + (row % 2 ? 4 - col : col) * 19, 12 + row * 23]; };
  const route = (spots) => spots.map(([emoji, name], i) => { const [x, y] = at(i); return { n: i + 1, emoji, name, x, y }; });

  const PALACES = [
    { id: "house", name: "The House", kind: "permanent", theme: "house",
      about: "For knowledge you want to keep. A list stays here, with reviews, until you retire it.",
      rooms: [["Garden and hall", 0, 4], ["Living room", 5, 9], ["Kitchen, bathroom and bedroom", 10, 14]],
      loci: route([["📫", "Mailbox"], ["🚪", "Front door"], ["🌂", "Umbrella stand"], ["🧥", "Coat hook"], ["🛋️", "Sofa"],
                   ["📺", "Television"], ["🎹", "Piano"], ["⏰", "Clock"], ["🍳", "Stove"], ["🍽️", "Dining table"],
                   ["🚿", "Shower"], ["🛁", "Bathtub"], ["🧸", "Toy box"], ["🛏️", "Bed"], ["💡", "Lamp"]]) },
    { id: "park", name: "The Adventure Park", kind: "practice", theme: "park",
      about: "For practice and short-term lists. When you finish a list it rests until tomorrow, then it is free again.",
      rooms: [["Entrance", 0, 4], ["Rides", 5, 9], ["Far side", 10, 14]],
      loci: route([["🎟️", "Ticket booth"], ["⛲", "Fountain"], ["🍦", "Ice-cream cart"], ["🎠", "Carousel"], ["🎡", "Big wheel"],
                   ["🎢", "Roller coaster"], ["🎪", "Circus tent"], ["🦆", "Duck pond"], ["🌳", "Old oak tree"], ["🌉", "Bridge"],
                   ["🏰", "Castle"], ["🚀", "Rocket"], ["🗼", "Tower"], ["🌋", "Volcano"], ["🌈", "Rainbow"]]) },
  ];

  // ---------- palaces from the games: every Balloon Math world and Frog Marbles track has 15 landmarks ----------
  // (seen while playing; learned here only when you choose). colours: map ground, path, 3D sky
  const world = (source, id, name, colours, spots) => ({ id: `${source}-${id}`, source, world: id, name, colours, theme: "world",
    about: source === "balloon" ? `Landmarks of the ${name.replace("Balloon ", "")} world in Balloon Math.` : `Landmarks along the ${name.replace("Frog ", "")} track in Frog Marbles.`,
    loci: route(spots) });
  const GAME_PALACES = [
    world("balloon", "meadow", "Balloon Meadow", ["#7bbf55", "#e9dca6", "#8fd0ff"], [["🌻", "Sunflower"], ["🐄", "Cow"], ["🚜", "Tractor"], ["🏡", "Farmhouse"], ["🐑", "Sheep"],
      ["🌾", "Haystack"], ["🌷", "Tulip bed"], ["🐓", "Rooster"], ["🍓", "Strawberry patch"], ["🧺", "Picnic basket"], ["🪁", "Kite"], ["🏚️", "Old barn"], ["🐇", "Rabbit hole"], ["🍄", "Mushroom ring"], ["🌈", "Rainbow end"]]),
    world("balloon", "beach", "Balloon Beach", ["#f0d79b", "#ffffff", "#7fd3f5"], [["🏖️", "Beach umbrella"], ["🦀", "Crab"], ["🐚", "Seashell"], ["⛱️", "Sunbed"], ["🏄", "Surfboard"],
      ["🍹", "Juice bar"], ["🦩", "Flamingo"], ["🏰", "Sandcastle"], ["🐢", "Sea turtle"], ["⚓", "Anchor"], ["🏐", "Volleyball net"], ["🐬", "Dolphin"], ["🚤", "Speedboat"], ["🗿", "Stone head"], ["🌅", "Sunset rock"]]),
    world("balloon", "sunset", "Balloon Sunset", ["#b56b6b", "#ffd29a", "#ff9a5a"], [["🏕️", "Campsite"], ["🔥", "Campfire"], ["🎸", "Guitar"], ["🌵", "Cactus"], ["🦉", "Owl"],
      ["🏮", "Lantern"], ["🦗", "Cricket"], ["🪑", "Bench"], ["🌄", "Hilltop"], ["🐺", "Wolf"], ["🎈", "Hot-air balloon"], ["🌙", "Crescent moon"], ["⛰️", "Big rock"], ["🚲", "Bicycle"], ["🍢", "Kebab stand"]]),
    world("balloon", "forest", "Balloon Forest", ["#3f7d45", "#b88b5a", "#a7e0b8"], [["🌲", "Pine tree"], ["🦌", "Deer"], ["🐻", "Bear cave"], ["🪓", "Woodcutter's axe"], ["🐿️", "Squirrel"],
      ["🍁", "Maple leaf"], ["🦔", "Hedgehog"], ["🏠", "Forest cabin"], ["🐸", "Frog stream"], ["🌰", "Acorn pile"], ["🦡", "Badger"], ["🕸️", "Spider web"], ["🐦", "Songbird"], ["🦊", "Fox den"], ["🌉", "Wooden bridge"]]),
    world("balloon", "snow", "Balloon Snow", ["#eef6ff", "#a9c4dd", "#cfe3f5"], [["⛄", "Snowman"], ["🎿", "Skis"], ["🛷", "Sled"], ["🐧", "Penguin"], ["🧊", "Ice block"],
      ["🏔️", "Snowy peak"], ["🦭", "Seal"], ["🧣", "Scarf"], ["☕", "Hot cocoa"], ["🐺", "Arctic wolf"], ["⛸️", "Ice skates"], ["🎄", "Fir tree"], ["🏂", "Snowboard"], ["🧤", "Mittens"], ["❄️", "Snowflake"]]),
    world("balloon", "desert", "Balloon Desert", ["#e2b26a", "#fff0c4", "#ffd9a0"], [["🐪", "Camel"], ["🌴", "Palm tree"], ["🦎", "Lizard"], ["⛺", "Tent"], ["💎", "Gemstone"],
      ["🏜️", "Dune"], ["🦅", "Eagle"], ["🪔", "Oil lamp"], ["🧞", "Genie"], ["🥥", "Coconut"], ["🐍", "Snake"], ["🗡️", "Dagger"], ["🧭", "Compass"], ["🌞", "Sun"], ["🕌", "Mosque"]]),
    world("balloon", "ocean", "Balloon Ocean", ["#2f6fa8", "#9fd8ff", "#1d8ac4"], [["🐠", "Clownfish"], ["🐙", "Octopus"], ["🦈", "Shark"], ["🐳", "Whale"], ["🏝️", "Sandbar island"],
      ["🦑", "Squid"], ["🐡", "Pufferfish"], ["🧜", "Mermaid"], ["⚓", "Shipwreck anchor"], ["🦞", "Lobster"], ["🐚", "Giant shell"], ["🤿", "Diving mask"], ["💰", "Treasure chest"], ["🌊", "Big wave"], ["🦦", "Sea otter"]]),
    world("balloon", "city", "Balloon City", ["#4a4f6b", "#c8c8d0", "#3a2d6b"], [["🚕", "Taxi"], ["🚦", "Traffic light"], ["🏦", "Bank"], ["🏥", "Hospital"], ["🚇", "Metro"],
      ["🏢", "Office tower"], ["🎭", "Theatre"], ["🍕", "Pizza place"], ["🚒", "Fire station"], ["📮", "Post box"], ["🏟️", "Stadium"], ["🚌", "Bus stop"], ["🏛️", "Museum"], ["🎡", "City wheel"], ["🗽", "Statue"]]),
    world("balloon", "volcano", "Balloon Volcano", ["#5a2a20", "#ff8a3d", "#b23a1e"], [["🌋", "Crater"], ["🦖", "T. rex"], ["🦕", "Long-neck dinosaur"], ["🔥", "Lava pool"], ["🧱", "Rock wall"],
      ["🥚", "Dinosaur egg"], ["🦴", "Bones"], ["🐉", "Dragon"], ["💨", "Steam vent"], ["⛏️", "Pickaxe"], ["🐜", "Ant hill"], ["🌑", "Black rock"], ["🧯", "Fire extinguisher"], ["🦂", "Scorpion"], ["☄️", "Comet"]]),
    world("balloon", "space", "Balloon Space", ["#1b1446", "#c9b6ff", "#05060f"], [["🚀", "Launch pad"], ["🛰️", "Satellite"], ["👽", "Alien"], ["🌍", "Earth view"], ["🌕", "Moon base"],
      ["🪐", "Ringed planet"], ["☄️", "Asteroid"], ["🛸", "Flying saucer"], ["🔭", "Telescope"], ["👨‍🚀", "Astronaut"], ["⭐", "Bright star"], ["🌌", "Galaxy cloud"], ["🤖", "Robot"], ["🌠", "Shooting star"], ["🕳️", "Black hole"]]),
    world("frog", "pond", "Frog Pond", ["#2a9d8f", "#0c3f43", "#7fd1b9"], [["🌸", "Water blossom"], ["🐸", "Big frog"], ["🦢", "Swan"], ["🐟", "Goldfish"], ["🎣", "Fishing spot"],
      ["🦟", "Mosquito"], ["🌿", "Reeds"], ["🐌", "Snail"], ["🦆", "Duck family"], ["🐢", "Turtle stone"], ["🐊", "Crocodile"], ["🍃", "Lily pad"], ["🛶", "Canoe"], ["🦋", "Dragonfly"], ["⛲", "Spring"]]),
    world("frog", "jungle", "Frog Jungle", ["#2f6b2f", "#3b2a17", "#9bd16a"], [["🐒", "Monkey tree"], ["🦜", "Parrot"], ["🐆", "Leopard"], ["🍌", "Banana grove"], ["🐍", "Python"],
      ["🌺", "Jungle flower"], ["🦍", "Gorilla"], ["🐘", "Elephant"], ["🛕", "Hidden temple"], ["🦥", "Sloth"], ["🥭", "Mango tree"], ["🗺️", "Explorer's map"], ["🐅", "Tiger"], ["🦩", "Pink bird"], ["💧", "Waterfall"]]),
    world("frog", "temple", "Frog Temple", ["#c9a46a", "#5b4026", "#e8cf9a"], [["⛩️", "Gate"], ["🔔", "Great bell"], ["🏮", "Red lantern"], ["🐉", "Dragon statue"], ["🍵", "Tea house"],
      ["🥋", "Training hall"], ["🎋", "Bamboo"], ["🦚", "Peacock"], ["🎐", "Wind chime"], ["🎎", "Dolls"], ["🗻", "Mountain view"], ["🐼", "Panda"], ["🧘", "Meditation stone"], ["📿", "Prayer beads"], ["🏯", "Pagoda"]]),
    world("frog", "desert", "Frog Desert", ["#f2c27a", "#8a4f1d", "#ffe0a6"], [["🌵", "Tall cactus"], ["🐂", "Ox"], ["🤠", "Cowboy"], ["🐎", "Wild horse"], ["🪕", "Banjo"],
      ["🏚️", "Ghost town"], ["🚂", "Steam train"], ["🌄", "Canyon"], ["🦨", "Skunk"], ["⛏️", "Gold mine"], ["🦃", "Turkey"], ["💀", "Cow skull"], ["🏇", "Rider"], ["🌪️", "Dust devil"], ["🛤️", "Rail track"]]),
    world("frog", "river", "Frog River", ["#2185c5", "#0a2b4d", "#a8dcf5"], [["🛶", "Rowing boat"], ["🏘️", "Riverside village"], ["🐟", "Salmon jump"], ["🌉", "Stone bridge"], ["🏞️", "River bend"],
      ["🎣", "Fishing rod"], ["🦦", "Otter"], ["⛴️", "Ferry"], ["🦢", "White swan"], ["🌊", "Rapids"], ["🚣", "Rafting"], ["🐻", "Fishing bear"], ["🏕️", "Riverside camp"], ["🦩", "Heron"], ["⚙️", "Water mill"]]),
    world("frog", "volcano", "Frog Volcano", ["#7a2414", "#160806", "#ff8a3d"], [["🌋", "Smoking cone"], ["🔥", "Fire geyser"], ["🌡️", "Thermometer"], ["🐲", "Fire dragon"], ["💥", "Explosion"],
      ["🦎", "Salamander"], ["⚒️", "Forge"], ["🛡️", "Shield"], ["🗡️", "Sword in stone"], ["👹", "Ogre mask"], ["🧪", "Potion"], ["🏺", "Ancient vase"], ["🦇", "Bat cave"], ["⛓️", "Chains"], ["👑", "Fire crown"]]),
    world("frog", "night", "Frog Night", ["#1e2457", "#11163a", "#8b93d8"], [["🌙", "Moon"], ["🦉", "Night owl"], ["🕯️", "Candle"], ["🏚️", "Haunted house"], ["🦇", "Bat"],
      ["🕰️", "Old clock"], ["🐈", "Black cat"], ["🔦", "Torch"], ["👻", "Ghost"], ["🎃", "Pumpkin"], ["🕷️", "Spider"], ["⚰️", "Coffin"], ["🔮", "Crystal ball"], ["🗝️", "Old key"], ["🌟", "North star"]]),
    world("frog", "galaxy", "Frog Galaxy", ["#2a1660", "#140b33", "#b59cff"], [["🌌", "Nebula"], ["🛸", "UFO"], ["🪐", "Saturn"], ["☄️", "Comet tail"], ["👾", "Space invader"],
      ["🌞", "Star"], ["🌑", "Dark moon"], ["🧪", "Space lab"], ["📡", "Dish antenna"], ["🛰️", "Space station"], ["👩‍🚀", "Spacewalker"], ["🌠", "Meteor"], ["🔭", "Observatory"], ["⚡", "Ion storm"], ["🕳️", "Wormhole"]]),
    world("frog", "giza", "Frog Giza", ["#e4b56d", "#a86f2c", "#ffd59a"], [["🐪", "Camel"], ["🌴", "Oasis palm"], ["🏜️", "Sand dune"], ["🦂", "Scorpion"], ["☀️", "Sun disk"],
      ["🐍", "Cobra"], ["🏺", "Amphora"], ["📜", "Papyrus scroll"], ["👁️", "Eye of Horus"], ["🐈", "Cat statue"], ["⛵", "Nile boat"], ["🗿", "Sphinx"], ["🔺", "Great Pyramid"], ["👑", "Pharaoh's crown"], ["⚱️", "Golden urn"]]),
  ];
  // palaces built in Block Craft with memory signs (kept by Block Craft in this browser)
  const CUSTOM_KEY = "sora.memoryPalace.custom.v1";
  function custom() {
    try { return (JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]") || []).filter((p) => p && p.id && Array.isArray(p.loci) && p.loci.length); }
    catch { return []; }
  }
  // the maps of Memory Ops (ops/maps.js, loaded before this file where they are wanted)
  const opsPalaces = () => (window.OpsMaps ? window.OpsMaps.palaces() : []);
  const all = () => [...PALACES, ...GAME_PALACES, ...opsPalaces(), ...custom()];

  const pack = (id, group, name, about, items) => ({ id, group, name, about, items });
  const simple = (list) => list.map(([emoji, text, image]) => ({ text, emoji, image }));
  const std = (list) => list.map(([key, text, image]) => ({ key, text, image }));

  const PACKS = [
    // ---------- for children ----------
    pack("animals", "children", "Animals", "15 animals", simple([
      ["🦁", "Lion", "a lion roaring"], ["🐘", "Elephant", "an elephant spraying water"], ["🦒", "Giraffe", "a giraffe stretching its long neck"],
      ["🐒", "Monkey", "a monkey swinging and eating a banana"], ["🐧", "Penguin", "a penguin sliding on its tummy"], ["🐢", "Turtle", "a slow turtle with a shiny shell"],
      ["🐸", "Frog", "a frog jumping and croaking"], ["🦋", "Butterfly", "a butterfly with rainbow wings"], ["🐬", "Dolphin", "a dolphin doing a flip"],
      ["🦉", "Owl", "an owl blinking its big eyes"], ["🐻", "Bear", "a bear hugging a honey pot"], ["🐰", "Rabbit", "a rabbit hopping with a carrot"],
      ["🦊", "Fox", "a fox with a fluffy orange tail"], ["🐝", "Bee", "a bee buzzing around"], ["🐴", "Horse", "a horse galloping"]])),
    pack("fruits", "children", "Fruits and vegetables", "15 things to eat", simple([
      ["🍎", "Apple", "a giant red apple"], ["🍌", "Banana", "a banana slipping"], ["🍇", "Grapes", "grapes bouncing like balls"],
      ["🍓", "Strawberry", "a strawberry with a smile"], ["🍊", "Orange", "an orange rolling"], ["🍉", "Watermelon", "a watermelon splitting open"],
      ["🍍", "Pineapple", "a pineapple wearing a crown"], ["🥕", "Carrot", "a carrot standing up straight"], ["🥦", "Broccoli", "broccoli like a little tree"],
      ["🌽", "Corn", "corn popping into popcorn"], ["🍒", "Cherries", "two cherries holding hands"], ["🍐", "Pear", "a pear wearing glasses"],
      ["🥒", "Cucumber", "a cucumber skating"], ["🍅", "Tomato", "a tomato squishing"], ["🥔", "Potato", "a potato sleeping"]])),
    pack("planets", "children", "The planets", "The 8 planets, from the Sun outwards", simple([
      ["🌑", "Mercury", "Mercury, the tiny hot planet nearest the Sun"], ["🌕", "Venus", "Venus, the shining bright planet, very hot and cloudy"],
      ["🌍", "Earth", "Earth, our blue and green home"], ["🔴", "Mars", "Mars, the red planet with a little robot rover"],
      ["🟠", "Jupiter", "Jupiter, the giant with a big red spot"], ["🪐", "Saturn", "Saturn, spinning its beautiful rings"],
      ["🔵", "Uranus", "Uranus, rolling on its side"], ["🌀", "Neptune", "Neptune, the windy deep-blue planet far away"]])),
    pack("colours", "children", "Colours", "9 colours", simple([
      ["🔴", "Red", "a red fire engine"], ["🟠", "Orange", "an orange pumpkin"], ["🟡", "Yellow", "a yellow sun"], ["🟢", "Green", "green grass"],
      ["🔵", "Blue", "a blue sea"], ["🟣", "Purple", "purple grapes"], ["🟤", "Brown", "a brown chocolate"], ["⚫", "Black", "a black cat"], ["⚪", "White", "white snow"]])),
    // ---------- everyday ----------
    pack("shopping", "everyday", "Shopping list", "15 things to buy", simple([
      ["🥛", "Milk", "a river of milk"], ["🍞", "Bread", "a loaf as big as a car"], ["🥚", "Eggs", "eggs hatching"], ["🧀", "Cheese", "cheese with mice in it"],
      ["🍚", "Rice", "rice raining down"], ["🍗", "Chicken", "a chicken dancing"], ["🧅", "Onions", "onions making everyone cry"], ["🍅", "Tomatoes", "tomatoes exploding"],
      ["☕", "Coffee", "a steaming coffee cup"], ["🍫", "Chocolate", "melting chocolate"], ["🧼", "Soap", "soap bubbles everywhere"], ["🧻", "Toilet paper", "a mummy wrapped in toilet paper"],
      ["🍯", "Honey", "sticky honey dripping"], ["🧂", "Salt", "a salt snowstorm"], ["🍝", "Pasta", "spaghetti tangled like wires"]])),
    // ---------- IFRS (titles as currently issued; IFRS 18 and 19 apply from 1 January 2027) ----------
    pack("ifrs-1", "ifrs", "IFRS Standards, part 1", "IFRS 1 to IFRS 16 (IFRS 4 was replaced by IFRS 17)", std([
      ["IFRS 1", "First-time Adoption of International Financial Reporting Standards", "a baby taking its very first steps on a ledger"],
      ["IFRS 2", "Share-based Payment", "employees being paid in shiny share certificates instead of cash"],
      ["IFRS 3", "Business Combinations", "two companies glued together into one giant company"],
      ["IFRS 5", "Non-current Assets Held for Sale and Discontinued Operations", "a factory with a huge FOR SALE sign and its lights switched off"],
      ["IFRS 6", "Exploration for and Evaluation of Mineral Resources", "a miner with a head torch digging for gold"],
      ["IFRS 7", "Financial Instruments: Disclosures", "a bond shouting all its risks through a megaphone"],
      ["IFRS 8", "Operating Segments", "an orange split into segments, each one a business line"],
      ["IFRS 9", "Financial Instruments", "a robot sorting coins into three boxes and predicting losses"],
      ["IFRS 10", "Consolidated Financial Statements", "a parent company holding all its children's report cards in one folder"],
      ["IFRS 11", "Joint Arrangements", "two people carrying a heavy sofa together"],
      ["IFRS 12", "Disclosure of Interests in Other Entities", "a spy revealing every company you have a stake in"],
      ["IFRS 13", "Fair Value Measurement", "a funfair scale weighing price tags"],
      ["IFRS 14", "Regulatory Deferral Accounts", "a referee freezing an electricity bill in a block of ice"],
      ["IFRS 15", "Revenue from Contracts with Customers", "five steps made of signed contracts leading to a cash register"],
      ["IFRS 16", "Leases", "a car with a rental key as big as a door"]])),
    pack("ifrs-2", "ifrs", "IFRS Standards, part 2", "IFRS 17 to IFRS 19", std([
      ["IFRS 17", "Insurance Contracts", "an umbrella shielding a contract from the rain"],
      ["IFRS 18", "Presentation and Disclosure in Financial Statements", "a stage curtain opening on a profit and loss split into neat categories (from 2027)"],
      ["IFRS 19", "Subsidiaries without Public Accountability: Disclosures", "a small subsidiary whispering a short disclosure (from 2027)"]])),
    pack("ias-1", "ifrs", "IAS Standards, part 1", "IAS 1 to IAS 24 (those still in force)", std([
      ["IAS 1", "Presentation of Financial Statements", "a waiter presenting the financial statements on a silver tray (replaced by IFRS 18 from 2027)"],
      ["IAS 2", "Inventories", "a warehouse overflowing with boxes"],
      ["IAS 7", "Statement of Cash Flows", "cash flowing like a river through three channels"],
      ["IAS 8", "Accounting Policies, Changes in Accounting Estimates and Errors", "a teacher correcting errors with a red pen"],
      ["IAS 10", "Events after the Reporting Period", "a calendar page flipping past the year end"],
      ["IAS 12", "Income Taxes", "a tax collector deferring a bag of money to next year"],
      ["IAS 16", "Property, Plant and Equipment", "a factory full of machines wearing price tags"],
      ["IAS 19", "Employee Benefits", "workers receiving gift boxes and a pension pot"],
      ["IAS 20", "Accounting for Government Grants and Disclosure of Government Assistance", "the government handing over a giant cheque"],
      ["IAS 21", "The Effects of Changes in Foreign Exchange Rates", "coins of many countries spinning on a currency wheel"],
      ["IAS 23", "Borrowing Costs", "a crane lifting a building made of loan interest"],
      ["IAS 24", "Related Party Disclosures", "a family tree printed in the notes"],
      ["IAS 26", "Accounting and Reporting by Retirement Benefit Plans", "a pension fund in a rocking chair keeping its own books"],
      ["IAS 27", "Separate Financial Statements", "a parent company standing alone on a separate page"],
      ["IAS 28", "Investments in Associates and Joint Ventures", "an equity pie with a 20 % slice"]])),
    pack("ias-2", "ifrs", "IAS Standards, part 2", "IAS 29 to IAS 41", std([
      ["IAS 29", "Financial Reporting in Hyperinflationary Economies", "a balloon of prices inflating until it pops"],
      ["IAS 32", "Financial Instruments: Presentation", "a coin deciding whether it is debt or equity"],
      ["IAS 33", "Earnings per Share", "a pie of profit cut into one slice per share"],
      ["IAS 34", "Interim Financial Reporting", "a half-time whistle at a football match"],
      ["IAS 36", "Impairment of Assets", "a cracked machine losing value"],
      ["IAS 37", "Provisions, Contingent Liabilities and Contingent Assets", "a rainy-day jar with an umbrella"],
      ["IAS 38", "Intangible Assets", "a glowing invisible brand logo"],
      ["IAS 40", "Investment Property", "a landlord collecting rent from a tower block"],
      ["IAS 41", "Agriculture", "a cow and a field of wheat being valued"]])),
    pack("ifrs15-steps", "ifrs", "IFRS 15: the five steps", "Revenue from Contracts with Customers", std([
      ["Step 1", "Identify the contract with a customer", "a magnifying glass over a signed contract"],
      ["Step 2", "Identify the performance obligations", "a list of promises ticked off one by one"],
      ["Step 3", "Determine the transaction price", "a price tag being calculated on a calculator"],
      ["Step 4", "Allocate the transaction price to the performance obligations", "a cake of money sliced between the promises"],
      ["Step 5", "Recognise revenue when (or as) each performance obligation is satisfied", "a cash register ringing as each promise is kept"]])),
  ];

  // ---------- lists from a file (e.g. made from a textbook), kept only in this browser, never in the app itself ----------
  // file: { "book": "...", "lists": [{ "id", "section", "name", "about", "items": [{ "key", "text", "image" }] }] }
  const IMPORT_KEY = "sora.memoryPalace.imported.v1";
  function imported() {
    try { return (JSON.parse(localStorage.getItem(IMPORT_KEY) || "[]") || []).filter((k) => k && k.id && Array.isArray(k.items) && k.items.length); }
    catch { return []; }
  }
  const cut = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  // adds the lists of a file; a file of the same book replaces that book's lists. Returns { book, count }
  function importLists(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("This is not a list file (it should be a .json file)."); }
    const book = cut(data?.book, 120) || "Imported lists";
    const lists = (Array.isArray(data?.lists) ? data.lists : []).map((k, i) => ({
      id: `imp-${cut(String(k?.id ?? ""), 60) || book.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (i + 1)}`, group: "imported", book,
      section: cut(k?.section, 120), name: cut(k?.name, 120) || `List ${i + 1}`, about: cut(k?.about, 200),
      items: (Array.isArray(k?.items) ? k.items : []).slice(0, 15).map((x) => ({ key: cut(x?.key, 80), text: cut(x?.text, 400), image: cut(x?.image, 300) }))
        .filter((x) => x.text).map((x) => (x.key ? x : { text: x.text, image: x.image })),
    })).filter((k) => k.items.length);
    if (!lists.length) throw new Error("No lists found in this file.");
    const keep = imported().filter((k) => k.book !== book && !lists.some((n) => n.id === k.id));
    try { localStorage.setItem(IMPORT_KEY, JSON.stringify([...keep, ...lists])); } catch { throw new Error("Not enough space in this browser to keep these lists."); }
    return { book, count: lists.length };
  }
  // the books of Study Quest (study/*.js, loaded before this file where they are wanted), offered the same way
  const studyLists = () => (window.StudyBooks || []).flatMap((b) => b.chapters.flatMap((c) => c.lists.filter((l) => l.palace && l.items.every((it) => !it.t)).map((l) => ({
    ...l, group: "imported", book: `${b.name}: ${b.title}`, section: `Chapter ${c.n}: ${c.title}`, builtIn: true }))));
  function removeBook(book) { localStorage.setItem(IMPORT_KEY, JSON.stringify(imported().filter((k) => k.book !== book))); }
  return { PALACES, GAME_PALACES, PACKS, CUSTOM_KEY, custom, all, route, IMPORT_KEY, imported, importLists, removeBook, studyLists };
})();
window.PalaceData = PalaceData;
