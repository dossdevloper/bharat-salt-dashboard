// ─────────────────────────────────────────────────────────────
//  Zoho Creator mapping for the Bharat Salt dashboard.
//
//  1. Set APP_NAME to your application link name (optional when the
//     widget runs inside the same app).
//  2. Set each `report` to the REPORT link name in your app
//     (Creator → Edit app → report → Properties → "Link name").
//  3. Each field entry is a list of candidate field link names — the
//     first one that exists on a record is used, so you only need to
//     add your real name to the front of the list if it differs.
// ─────────────────────────────────────────────────────────────

// Modules listed here are read live from Zoho Creator (when the widget runs
// inside Creator). Every other module uses the static sample data in
// mockData.js until its report is wired up — add its key here to switch it.
export const LIVE_MODULES = ["processOrders"];

export const APP_NAME = ""; // e.g. "bharat-salt" — leave blank to use the current app

export const COMPANY = {
  name: "Salt Production Command",
  tagline: "Bharat Salt Refineries Pvt. Ltd · Plant 2100",
};

// Max records pulled per report (paged in 200s).
export const MAX_RECORDS = 2000;

// How dates come back from your app (Settings → General → Date format).
// "dd-MMM-yyyy" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd"
export const DATE_FORMAT = "dd-MMM-yyyy";

export const UNIT = "MT"; // quantity unit shown on the dashboard

export const MODULES = {
  processOrders: {
    label: "Process Orders",
    report: "All_Process_Orders",
    form: "Process_Order",
    // Field link names from the Process Order form (first match wins).
    fields: {
      number: ["Process_Order", "Process_Order_No", "Order_No"],
      material: ["Material_Name", "Material", "Product"],
      productionPlant: ["Production_Plant"],
      planningPlant: ["Planning_Plant", "Plant"],
      crystallizer: ["Crystallizer", "Crystallizer_Name"],
      orderType: ["Process_Order_Type", "Order_Type"],
      planning: ["Production_Planning"],
      uom: ["UOM", "Unit"],
      planned: ["Total_Qty", "Total_Quantity", "Planned_Quantity"],
      produced: ["Actual_Quantity", "Actual_Qty", "Produced_Quantity"],
      balance: ["Balance_Quantity", "Balance_Qty"],
      shortExc: ["Short_Exc_Rec", "Short_Exc_Receipt", "Short_Excess_Receipt"],
      delivered: ["Delivered", "Delivered_Qty"],
      status: ["Status", "Order_Status"],
      startDate: ["Start_Date"],
      endDate: ["End_Date"],
      releaseDate: ["Release", "Release_Date"],
      goodsReceipt: ["Goods_Receipt"],
      schedType: ["Type", "Scheduling_Type"],
      reduction: ["Reduction"],
      priority: ["Priority"],
      notes: ["Notes"],
      marginKey: ["Sched_Margin_Key", "Scheduling_Margin_Key"],
      floatBefore: ["Float_Before_Prodn", "Float_Before_Production"],
      floatAfter: ["Float_After_Prdn", "Float_After_Production"],
      releasePeriod: ["Release_Period"],
      created: ["Added_Time"],
    },
  },
  dailyProduction: {
    label: "Daily Production Entry",
    report: "All_Daily_Production_Entries",
    form: "Daily_Production_Entry",
    fields: {
      number: ["Entry_No", "Production_Entry_No", "ID"],
      date: ["Entry_Date", "Production_Date", "Date", "Added_Time"],
      plant: ["Plant", "Plant_Name", "Plant_Master"],
      crystallizer: ["Crystallizer", "Crystallizer_Name", "Crystallizer_Master"],
      processOrder: ["Process_Order", "Process_Order_No"],
      shift: ["Shift"],
      quantity: ["Quantity_Produced", "Production_Quantity", "Produced_Quantity", "Quantity", "Net_Quantity"],
      density: ["Brine_Density", "Density", "Baume", "Brine_Baume"],
    },
  },
  bom: {
    label: "BOM",
    report: "All_BOMs",
    form: "BOM",
    fields: {
      number: ["BOM_No", "BOM_Number", "BOM_Code", "BOM_Name"],
      product: ["Product", "Product_Name", "Finished_Good", "Item"],
      plant: ["Plant", "Plant_Name"],
      quantity: ["Base_Quantity", "Quantity", "Output_Quantity"],
      components: ["BOM_Items", "Components", "BOM_Details", "Items", "Raw_Materials"],
      status: ["Status", "BOM_Status"],
      date: ["Effective_Date", "Date", "Added_Time"],
    },
  },
  productionReceipt: {
    label: "Production Receipt",
    report: "All_Production_Receipts",
    form: "Production_Receipt",
    fields: {
      number: ["Receipt_No", "Production_Receipt_No", "GRN_No", "Receipt_Number"],
      date: ["Receipt_Date", "Date", "Added_Time"],
      processOrder: ["Process_Order", "Process_Order_No"],
      plant: ["Plant", "Plant_Name"],
      product: ["Product", "Product_Name", "Item"],
      quantity: ["Received_Quantity", "Receipt_Quantity", "Quantity", "Accepted_Quantity"],
      warehouse: ["Warehouse", "Store", "Location"],
      status: ["Status", "Receipt_Status"],
    },
  },
  crystallizers: {
    label: "Crystallizer Master",
    report: "All_Crystallizer_Masters",
    form: "Crystallizer_Master",
    fields: {
      code: ["Crystallizer_Code", "Code", "Crystallizer_No"],
      name: ["Crystallizer_Name", "Name", "Crystallizer"],
      plant: ["Plant", "Plant_Name"],
      capacity: ["Capacity", "Capacity_MT", "Capacity_in_MT"],
      area: ["Area", "Area_Acres", "Area_in_Acres"],
      status: ["Status", "Crystallizer_Status"],
    },
  },
  plants: {
    label: "Plant Master",
    report: "All_Plant_Masters",
    form: "Plant_Master",
    fields: {
      code: ["Plant_Code", "Code"],
      name: ["Plant_Name", "Name", "Plant"],
      location: ["Location", "City", "Address", "District"],
      capacity: ["Capacity", "Capacity_MT", "Installed_Capacity"],
      status: ["Status", "Plant_Status"],
    },
  },
};
