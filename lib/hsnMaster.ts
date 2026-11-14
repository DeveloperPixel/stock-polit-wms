export interface HsnMasterItem {
  code: string;
  label: string;
  category: string;
  gst: number;
}

export const HSN_MASTER_DATABASE: HsnMasterItem[] = [
  // --- Section I & II: Agriculture, Food, Dairy & Beverages ---
  { code: '0401', label: '0401 — Milk & Cream (Fresh / Pasteurized)', category: 'Dairy', gst: 0 },
  { code: '0402', label: '0402 — Milk Powder, Condensed Milk', category: 'Dairy', gst: 5 },
  { code: '0405', label: '0405 — Butter, Ghee, Dairy Spreads', category: 'Dairy', gst: 12 },
  { code: '0406', label: '0406 — Cheese & Curd Products', category: 'Dairy', gst: 12 },
  { code: '0709', label: '0709 — Fresh / Chilled Vegetables', category: 'Agriculture', gst: 0 },
  { code: '0801', label: '0801 — Coconuts, Brazil Nuts & Cashew Nuts', category: 'Dry Fruits', gst: 5 },
  { code: '0802', label: '0802 — Almonds, Walnuts & Pistachios', category: 'Dry Fruits', gst: 5 },
  { code: '0901', label: '0901 — Coffee & Roasted Beans', category: 'Beverages', gst: 5 },
  { code: '0902', label: '0902 — Tea & Black / Green Tea Leaves', category: 'Beverages', gst: 5 },
  { code: '0904', label: '0904 — Pepper, Dried Chili & Spices', category: 'Spices', gst: 5 },
  { code: '0910', label: '0910 — Ginger, Saffron, Turmeric, Thyme', category: 'Spices', gst: 5 },
  { code: '1001', label: '1001 — Wheat and Meslin', category: 'Grains', gst: 0 },
  { code: '1006', label: '1006 — Rice (Basmati / Non-Basmati)', category: 'Grains', gst: 0 },
  { code: '1509', label: '1509 — Olive Oil & Refined Fractions', category: 'Oils', gst: 5 },
  { code: '1512', label: '1512 — Sunflower-Seed or Safflower Oil', category: 'Oils', gst: 5 },
  { code: '1701', label: '1701 — Cane or Beet Sugar', category: 'Sugar & Sweets', gst: 5 },
  { code: '1704', label: '1704 — Sugar Confectionery & Candies', category: 'Confectionery', gst: 18 },
  { code: '1806', label: '1806 — Chocolate & Cocoa Preparations', category: 'Confectionery', gst: 18 },
  { code: '1905', label: '1905 — Bread, Pastries, Cakes, Biscuits', category: 'Bakery', gst: 18 },
  { code: '21069099', label: '21069099 — Packaged Food Preparations & Snacks', category: 'Food', gst: 12 },
  { code: '2201', label: '2201 — Mineral Waters & Aerated Waters', category: 'Beverages', gst: 18 },
  { code: '2202', label: '2202 — Sweetened Beverages & Energy Drinks', category: 'Beverages', gst: 28 },

  // --- Section V & VI: Minerals, Chemicals, Pharma & Cosmetics ---
  { code: '2523', label: '2523 — Portland Cement, Aluminous Cement', category: 'Construction', gst: 28 },
  { code: '2710', label: '2710 — Petroleum Oils, Lubricating Greases', category: 'Petrochemicals', gst: 18 },
  { code: '2804', label: '2804 — Hydrogen, Rare Gases, Nitrogen, Oxygen', category: 'Industrial Gases', gst: 18 },
  { code: '3004', label: '3004 — Medicaments & Formulated Pharmaceuticals', category: 'Pharma', gst: 12 },
  { code: '3005', label: '3005 — Bandages, Gauze, Surgical Dressings', category: 'Medical', gst: 12 },
  { code: '3208', label: '3208 — Paints and Varnishes based on Synthetic Polymers', category: 'Paints', gst: 18 },
  { code: '3215', label: '3215 — Printing Ink, Writing Ink and Other Inks', category: 'Printing', gst: 18 },
  { code: '3304', label: '3304 — Beauty, Skincare & Make-up Preparations', category: 'Cosmetics', gst: 18 },
  { code: '3305', label: '3305 — Shampoos & Hair Preparations', category: 'Cosmetics', gst: 18 },
  { code: '3401', label: '3401 — Soap, Organic Surface-Active Bath Products', category: 'Cleaning', gst: 18 },
  { code: '3402', label: '3402 — Detergents, Washing & Cleaning Preparations', category: 'Cleaning', gst: 18 },
  { code: '3506', label: '3506 — Prepared Glues & Industrial Adhesives', category: 'Adhesives', gst: 18 },
  { code: '38249900', label: '38249900 — Miscellaneous Chemical Preparations', category: 'Chemicals', gst: 18 },

  // --- Section VII: Plastics & Rubber ---
  { code: '3901', label: '3901 — Polymers of Ethylene, in Primary Forms (Granules)', category: 'Plastics Raw', gst: 18 },
  { code: '3917', label: '3917 — Tubes, Pipes and Hoses of Plastics', category: 'Plastics', gst: 18 },
  { code: '3920', label: '3920 — Plastic Sheets, Film, Foil and Strip', category: 'Packaging', gst: 18 },
  { code: '39231090', label: '39231090 — Plastic Crates, Trays, Boxes & Packing Articles', category: 'Packaging', gst: 18 },
  { code: '3924', label: '3924 — Tableware, Kitchenware & Household Plastic Articles', category: 'Houseware', gst: 18 },
  { code: '3926', label: '3926 — Other Articles of Plastics & Molded Parts', category: 'Industrial', gst: 18 },
  { code: '4011', label: '4011 — New Pneumatic Rubber Tyres (Automotive)', category: 'Automotive', gst: 28 },
  { code: '4016', label: '4016 — Vulcanised Rubber Gaskets, Washers & O-rings', category: 'Hardware Spares', gst: 18 },

  // --- Section VIII & IX: Leather & Wood ---
  { code: '4202', label: '4202 — Travel Bags, Suitcases, Briefcases & Backpacks', category: 'Luggage', gst: 18 },
  { code: '4203', label: '4203 — Articles of Apparel and Clothing Accessories of Leather', category: 'Apparel', gst: 18 },
  { code: '4407', label: '4407 — Wood Sawn or Chipped Lengthwise (Timber/Lumber)', category: 'Timber', gst: 18 },
  { code: '4410', label: '4410 — Particle Board & Oriented Strand Board', category: 'Woodwork', gst: 18 },
  { code: '4412', label: '4412 — Plywood, Veneered Panels & Laminated Wood', category: 'Woodwork', gst: 18 },
  { code: '4415', label: '4415 — Wooden Packing Cases, Boxes, Crates & Pallets', category: 'Packaging Pallets', gst: 12 },

  // --- Section X: Paper & Packaging ---
  { code: '4802', label: '4802 — Uncoated Paper for Writing, Printing or Photocopy', category: 'Paper', gst: 12 },
  { code: '48191010', label: '48191010 — Corrugated Paper/Carton Packing Boxes', category: 'Packaging', gst: 12 },
  { code: '48192000', label: '48192000 — Folding Cartons & Paperboard Boxes', category: 'Packaging', gst: 12 },
  { code: '4820', label: '4820 — Registers, Account Books, Note Books, Order Books', category: 'Stationery', gst: 18 },
  { code: '4901', label: '4901 — Printed Books, Brochures & Leaflets', category: 'Printing', gst: 0 },

  // --- Section XI: Textiles & Fabrics (Including 55/556) ---
  { code: '52081100', label: '52081100 — Woven Cotton Fabrics (Plain Weave)', category: 'Textiles', gst: 5 },
  { code: '5407', label: '5407 — Woven Fabrics of Synthetic Filament Yarn', category: 'Textiles', gst: 5 },
  { code: '5505', label: '5505 — Waste of Synthetic or Man-Made Fibres', category: 'Textiles', gst: 18 },
  { code: '5506', label: '5506 — Synthetic Staple Fibres, Carded/Combed (Polyester/Nylon)', category: 'Textiles Raw', gst: 18 },
  { code: '55061000', label: '55061000 — Synthetic Staple Fibres of Nylon / Polyamides', category: 'Textiles Raw', gst: 18 },
  { code: '55062000', label: '55062000 — Synthetic Staple Fibres of Polyesters', category: 'Textiles Raw', gst: 18 },
  { code: '55063000', label: '55063000 — Synthetic Staple Fibres of Acrylic / Modacrylic', category: 'Textiles Raw', gst: 18 },
  { code: '5516', label: '5516 — Woven Fabrics of Artificial Staple Fibres', category: 'Textiles', gst: 5 },
  { code: '6109', label: '6109 — T-shirts, Singlets and Other Vests (Knitted)', category: 'Apparel', gst: 5 },
  { code: '6203', label: '6203 — Men’s Suits, Jackets, Trousers & Shorts', category: 'Apparel', gst: 5 },
  { code: '6302', label: '6302 — Bed Linen, Table Linen, Toilet Linen & Towels', category: 'Home Textiles', gst: 5 },
  { code: '6403', label: '6403 — Footwear with Outer Soles of Rubber/Leather', category: 'Footwear', gst: 18 },

  // --- Section XV: Metals, Fasteners & Hardware ---
  { code: '7214', label: '7214 — TMT Steel Bars & Rods of Iron/Non-alloy Steel', category: 'Metals & Construction', gst: 18 },
  { code: '7306', label: '7306 — Tubes, Pipes and Hollow Profiles of Iron or Steel', category: 'Pipes & Metal', gst: 18 },
  { code: '73181500', label: '73181500 — Screws, Bolts, Nuts, Rivets & Fasteners', category: 'Hardware', gst: 18 },
  { code: '7326', label: '7326 — Other Articles of Iron or Steel (Fabricated Goods)', category: 'Metal Fab', gst: 18 },
  { code: '7606', label: '7606 — Aluminium Plates, Sheets and Strip', category: 'Aluminium', gst: 18 },
  { code: '8205', label: '8205 — Hand Tools (Pliers, Wrenches, Hammers, Screwdrivers)', category: 'Tools', gst: 18 },
  { code: '8301', label: '8301 — Padlocks, Locks and Keys of Base Metal', category: 'Hardware', gst: 18 },
  { code: '8302', label: '8302 — Hinges, Mountings, Fittings for Furniture/Doors', category: 'Hardware', gst: 18 },

  // --- Section XVI: Machinery, Mechanical & Electrical Equipment ---
  { code: '8414', label: '8414 — Air or Vacuum Pumps, Fans, Blowers & Compressors', category: 'Machinery', gst: 18 },
  { code: '8415', label: '8415 — Air Conditioning Machines & Systems', category: 'Appliances', gst: 28 },
  { code: '8418', label: '8418 — Refrigerators, Freezers & Cold Storage Units', category: 'Appliances', gst: 18 },
  { code: '8443', label: '8443 — Printers, Copiers, Fax Machines & Multifunction Units', category: 'Office IT', gst: 18 },
  { code: '84713010', label: '84713010 — Laptops, Tablets & Portable Computers', category: 'Computers', gst: 18 },
  { code: '84714190', label: '84714190 — Desktop Workstations & Microcomputers', category: 'Computers', gst: 18 },
  { code: '84717020', label: '84717020 — Hard Disk Drives (HDD) & Solid State Drives (SSD)', category: 'Storage Hardware', gst: 18 },
  { code: '84733020', label: '84733020 — Motherboards, Memory RAM & Graphic Processing Units', category: 'Computer Parts', gst: 18 },
  { code: '8481', label: '8481 — Taps, Cocks, Valves for Pipes, Tanks or Vats', category: 'Industrial Valves', gst: 18 },
  { code: '8482', label: '8482 — Ball or Roller Bearings', category: 'Mechanical Spares', gst: 18 },
  { code: '85044090', label: '85044090 — SMPS, Power Adapters, Inverters & Battery Chargers', category: 'Power Electronics', gst: 18 },
  { code: '85076000', label: '85076000 — Lithium-ion Batteries & Battery Packs', category: 'Batteries', gst: 18 },
  { code: '85176290', label: '85176290 — Routers, Switches, Modems & Wi-Fi Network Devices', category: 'Networking', gst: 18 },
  { code: '85177090', label: '85177090 — Mobile Phone Parts & Communication Accessories', category: 'Telecom', gst: 18 },
  { code: '85285200', label: '85285200 — Computer Monitors & Display Screens', category: 'Electronics', gst: 18 },
  { code: '85369090', label: '85369090 — Electrical Connectors, Plugs, Sockets & Terminals', category: 'Electrical Spares', gst: 18 },
  { code: '85414011', label: '85414011 — Solar Cells & Photovoltaic Modules', category: 'Solar', gst: 12 },
  { code: '85423100', label: '85423100 — Microprocessors, Microcontrollers & Integrated Circuits (IC)', category: 'Semiconductors', gst: 18 },
  { code: '85444299', label: '85444299 — Insulated Electric Wire & Power/Data Cables', category: 'Cables & Wiring', gst: 18 },

  // --- Section XVII & XVIII: Vehicles, Instruments, Sensors ---
  { code: '8708', label: '8708 — Parts and Accessories of Motor Vehicles', category: 'Automotive Spares', gst: 28 },
  { code: '8711', label: '8711 — Motorcycles, Scooters & Electric Two-Wheelers', category: 'Automotive', gst: 28 },
  { code: '9026', label: '9026 — Instruments for Measuring Flow, Level or Pressure', category: 'Sensors & Metering', gst: 18 },
  { code: '9029', label: '9029 — Revolution Counters, Taximeters, Odometers, Speedometers', category: 'Instrumentation', gst: 18 },
  { code: '9031', label: '9031 — Measuring or Checking Optical Instruments & Test Equipment', category: 'Testing Equipment', gst: 18 },

  // --- Section XX: Furniture & Miscellaneous ---
  { code: '9403', label: '9403 — Warehouse Steel Racks, Shelving, Tables & Metal Furniture', category: 'Warehouse Furniture', gst: 18 },
  { code: '9405', label: '9405 — LED Luminaires, Lamps & Lighting Fixtures', category: 'Lighting', gst: 18 },
  { code: '9503', label: '9503 — Tricycles, Scooters, Pedal Cars & Toys', category: 'Toys & Games', gst: 12 },
  { code: '9608', label: '9608 — Ball Point Pens, Markers, Fountain Pens & Refills', category: 'Stationery', gst: 18 }
];

/**
 * Filter HSN Database by query string (matches code, label, or category).
 * Limits to top `limit` results for maximum UI responsiveness.
 */
export function searchHsnDatabase(query: string, limit = 25): HsnMasterItem[] {
  if (!query || !query.trim()) {
    return HSN_MASTER_DATABASE.slice(0, limit);
  }
  const q = query.toLowerCase().trim();
  const matched = HSN_MASTER_DATABASE.filter(item => {
    return (
      item.code.includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });
  return matched.slice(0, limit);
}
