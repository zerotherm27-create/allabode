// Fixed checklist fields for the Property Management Agreement's Annex B
// (Inventory and Turnover Checklist). Shared between the admin "pre-fill
// inventory" form and the PDF template so the two never drift apart.

export const KEY_ITEMS: [string, string][] = [
  ["main_door_keys", "Main Door Keys"], ["bedroom_keys", "Bedroom Keys"], ["mailbox_key", "Mailbox Key"],
  ["rfid_card", "RFID / Access Card"], ["parking_card", "Parking Card"], ["gate_remote", "Gate Remote"], ["other_keys", "Other Keys"],
];

export const FURNITURE_ITEMS: [string, string][] = [
  ["sofa", "Sofa"], ["dining_table", "Dining Table"], ["dining_chairs", "Dining Chairs"], ["coffee_table", "Coffee Table"],
  ["bed_frame", "Bed Frame"], ["mattress", "Mattress"], ["side_table", "Side Table"], ["cabinet", "Cabinet"],
  ["desk", "Desk"], ["office_chair", "Office Chair"], ["curtains_blinds", "Curtains / Blinds"], ["others", "Others"],
];

export const APPLIANCE_ITEMS: [string, string][] = [
  ["refrigerator", "Refrigerator"], ["air_conditioner", "Air Conditioner"], ["television", "Television"], ["microwave", "Microwave"],
  ["induction_cooker", "Induction Cooker"], ["rice_cooker", "Rice Cooker"], ["electric_kettle", "Electric Kettle"],
  ["washing_machine", "Washing Machine"], ["water_heater", "Water Heater"], ["range_hood", "Range Hood"], ["others", "Others"],
];

export const FIXTURE_ITEMS: [string, string][] = [
  ["smoke_detector", "Smoke Detector"], ["fire_extinguisher", "Fire Extinguisher"], ["exhaust_fan", "Exhaust Fan"],
  ["kitchen_sink", "Kitchen Sink"], ["toilet", "Toilet"], ["shower", "Shower"], ["bathroom_sink", "Bathroom Sink"],
  ["faucets", "Faucets"], ["door_locks", "Door Locks"], ["windows", "Windows"], ["lights", "Lights"],
  ["electrical_outlets", "Electrical Outlets"], ["internet_connection", "Internet Connection"], ["telephone_line", "Telephone Line"],
];

export const CONDITION_AREAS: [string, string][] = [
  ["walls", "Walls"], ["flooring", "Flooring"], ["ceiling", "Ceiling"], ["kitchen", "Kitchen"], ["bathroom", "Bathroom"],
  ["bedroom", "Bedroom"], ["living_room", "Living Room"], ["balcony", "Balcony"], ["other_remarks", "Other Remarks"],
];
