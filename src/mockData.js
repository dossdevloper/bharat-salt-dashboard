// Static sample data — used for modules not listed in LIVE_MODULES
// (config.js), and for everything when running outside Zoho Creator. Shapes match the normalised rows.

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
};

// Cost-bearing BOM lines per 1,000 kg of finished salt.
const BOM_RECIPES = {
  "Crude Salt": [
    ["Sea brine", 1180, "kg", 0.6],
    ["Power & pumping", 42, "kWh", 8],
    ["HDPE bags 50 kg", 20, "nos", 14],
  ],
  "Refined Free Flow Salt": [
    ["Crude salt", 1060, "kg", 1.4],
    ["Anti-caking agent", 0.01, "kg", 900],
    ["Power & pumping", 95, "kWh", 8],
    ["Laminated pouch 1 kg", 1000, "nos", 0.9],
    ["Washing water", 1500, "L", 0.05],
  ],
  "Iodized Salt": [
    ["Crude salt", 1050, "kg", 1.4],
    ["Potassium iodate", 0.05, "kg", 4200],
    ["Power & pumping", 80, "kWh", 8],
    ["Laminated pouch 1 kg", 1000, "nos", 0.9],
    ["Washing water", 1400, "L", 0.05],
  ],
  "Industrial Salt": [
    ["Crude salt", 1030, "kg", 1.4],
    ["Power & pumping", 55, "kWh", 8],
    ["HDPE bags 50 kg", 20, "nos", 14],
  ],
  "Double Fortified Salt": [
    ["Crude salt", 1060, "kg", 1.4],
    ["Potassium iodate", 0.05, "kg", 4200],
    ["Ferrous fumarate", 3.3, "kg", 520],
    ["Anti-caking agent", 0.01, "kg", 900],
    ["Power & pumping", 110, "kWh", 8],
    ["Laminated pouch 1 kg", 1000, "nos", 0.9],
  ],
};

export function buildMockData() {
  const r = rng(42);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];

  const plants = [
    { code: "PL-01", name: "Tuticorin Salt Works", location: "Thoothukudi, TN", capacity: 56000, status: "Active" },
    { code: "PL-02", name: "Vedaranyam Pans", location: "Nagapattinam, TN", capacity: 52000, status: "Active" },
    { code: "PL-03", name: "Marakkanam Unit", location: "Villupuram, TN", capacity: 27000, status: "Active" },
    { code: "PL-04", name: "Kutch Refinery", location: "Gandhidham, GJ", capacity: 40000, status: "Under Maintenance" },
  ].map((p, i) => ({ id: `p${i}`, ...p }));

  const crystallizers = [];
  plants.forEach((p, pi) => {
    const n = [6, 4, 3, 5][pi];
    for (let i = 1; i <= n; i++) {
      const roll = r();
      crystallizers.push({
        id: `c${pi}${i}`,
        code: `CR-${pi + 1}${String(i).padStart(2, "0")}`,
        name: `Crystallizer ${pi + 1}${String.fromCharCode(64 + i)}`,
        plant: p.name,
        capacity: Math.round(900 + r() * 1600),
        area: Math.round((4 + r() * 10) * 10) / 10,
        status: p.status !== "Active" ? "Under Maintenance" : roll > 0.85 ? "Idle" : roll > 0.75 ? "Under Maintenance" : "Active",
      });
    }
  });

  const products = Object.keys(BOM_RECIPES);

  const bom = products.flatMap((prod, i) =>
    plants.slice(0, i % 2 ? 2 : 3).map((p, j) => ({
      id: `b${i}${j}`,
      number: `BOM-${String(i * 10 + j + 1).padStart(3, "0")}`,
      product: prod,
      plant: p.name,
      quantity: 1000,
      items: BOM_RECIPES[prod].map(([name, qty, uom, rate]) => ({ name, qty, uom, rate, cost: qty * rate })),
      components: BOM_RECIPES[prod].length,
      status: i === 4 && j === 2 ? "Inactive" : j === 2 && i === 0 ? "Draft" : "Active",
      date: day(Math.floor(r() * 300)),
    })),
  );

  const statuses = ["Completed", "Completed", "Completed", "In Progress", "In Progress", "Open", "On Hold", "Cancelled"];
  // Shaped like the Process Order form (Material, plants, crystallizer,
  // quantities, dates, scheduling, floats). Statuses follow SAP-style values.
  const processOrders = [];
  const materials = ["Crude Salt (Bulk)", "Refined Free Flow Salt 1kg", "Iodized Salt 1kg", "Industrial Salt 50kg", "Double Fortified Salt 1kg"];
  const uoms = { "Crude Salt (Bulk)": "MT", "Refined Free Flow Salt 1kg": "Box", "Iodized Salt 1kg": "Box", "Industrial Salt 50kg": "Bag", "Double Fortified Salt 1kg": "Box" };
  const activeCr = crystallizers.filter((c) => c.status === "Active");
  for (let i = 0; i < 80; i++) {
    const age = Math.floor(r() * 120);
    const bucket =
      age < 4 ? pick(["Open", "In Progress"])
      : age < 15 ? pick(["In Progress", "In Progress", "Open", "Completed", "On Hold"])
      : age < 30 ? pick(statuses)
      : pick(["Completed", "Completed", "Completed", "Completed", "Cancelled", "On Hold"]);
    const status = { Open: "Created", "In Progress": pick(["Released", "In Process"]), Completed: "Completed", "On Hold": "On Hold", Cancelled: "Cancelled" }[bucket];
    const material = pick(materials);
    const planned = Math.round((2 + r() * 10)) * 1000;
    const ratio = bucket === "Completed" ? 0.94 + r() * 0.08 : bucket === "In Progress" ? 0.2 + r() * 0.6 : bucket === "Open" ? 0 : r() * 0.4;
    const produced = Math.round((planned * ratio) / 10) * 10;
    const cr = pick(activeCr);
    const duration = 3 + Math.floor(r() * 12);
    processOrders.push({
      id: `po${i}`,
      number: `COR-${i + 1}`,
      material,
      productionPlant: cr.plant,
      planningPlant: "2100-Bharat Salt",
      crystallizer: cr.name,
      orderType: pick(["Standard Production", "Standard Production", "Rework", "Trial Run"]),
      planning: pick(["Make to Stock", "Make to Order"]),
      uom: uoms[material],
      planned,
      produced,
      balance: Math.max(0, planned - produced),
      shortExc: bucket === "Completed" ? Math.round((produced - planned) / 10) * 10 : 0,
      delivered: bucket === "Completed" ? Math.round(produced * (0.7 + r() * 0.3)) : Math.round(produced * r() * 0.5),
      status,
      startDate: day(age),
      endDate: day(age - duration),
      releaseDate: bucket === "Open" ? null : day(age - 1),
      goodsReceipt: bucket === "Completed" ? `${pick(activeCr).name} - GR` : "",
      schedType: pick(["Forward", "Backward", "Current date"]),
      reduction: pick(["", "", "Level 1"]),
      priority: String(1 + Math.floor(r() * 5)),
      notes: r() > 0.7 ? pick(["Monsoon buffer — monitor brine density", "Priority dispatch for distributor", "Rework after QC deviation"]) : "",
      marginKey: pick(["000", "001", "002"]),
      floatBefore: Math.floor(r() * 3),
      floatAfter: Math.floor(r() * 2),
      releasePeriod: Math.floor(r() * 4),
      date: day(age),
      product: material,
      plant: cr.plant,
    });
  }

  const dailyProduction = [];
  const active = crystallizers.filter((c) => c.status === "Active");
  for (let d = 0; d < 400; d++) {
    const season = 0.75 + 0.35 * Math.sin((d / 365) * Math.PI * 2 + 1);
    active.forEach((c, i) => {
      if (r() < 0.25) return;
      dailyProduction.push({
        id: `dp${d}-${i}`,
        number: `DPE-${String(d * 20 + i).padStart(5, "0")}`,
        date: day(d),
        plant: c.plant,
        crystallizer: c.name,
        processOrder: pick(processOrders).number,
        shift: r() < 0.5 ? "Morning" : r() < 0.75 ? "Evening" : "Night",
        quantity: Math.round((c.capacity / 30) * season * (0.6 + r() * 0.7) * 10) / 10,
        density: Math.round((24.5 + r() * 4) * 10) / 10,
      });
    });
  }

  const warehouses = ["Main Yard", "Godown A", "Godown B", "Bagging Shed"];
  const productionReceipt = [];
  for (let d = 0; d < 400; d++) {
    const n = Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const po = pick(processOrders);
      productionReceipt.push({
        id: `pr${d}-${k}`,
        number: `PR-${String(9000 - d * 4 - k)}`,
        date: day(d),
        processOrder: po.number,
        plant: po.plant,
        product: po.product,
        quantity: Math.round(60 + r() * 240),
        warehouse: warehouses[Math.min(3, Math.floor(r() * r() * 5))],
        status: d < 3 && r() > 0.5 ? "Pending QC" : "Received",
      });
    }
  }

  return { plants, crystallizers, bom, processOrders, dailyProduction, productionReceipt };
}
