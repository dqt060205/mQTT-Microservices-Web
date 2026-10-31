// In-browser fake backend (localStorage) so the UI works before the other services exist.
// Demo account: demo@mqtt.dev / demo1234
import { getToken } from './token';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const P = (id, name, category, price, stock, rating, reviewCount, description, bullets) =>
  ({ id: String(id), name, category, price, stock, rating, reviewCount, description, bullets });

const PRODUCTS = [
  P(1, 'ESP32-S3 DevKitC-1 (WiFi + BLE)', 'Boards', 189000, 42, 4.7, 1284, 'Dual-core microcontroller with WiFi and Bluetooth 5 for connected sensors and gateways.', ['Dual-core Xtensa LX7 up to 240 MHz', 'WiFi 802.11 b/g/n and Bluetooth 5 LE', '45 programmable GPIO pins', 'Works with Arduino IDE, ESP-IDF and MicroPython']),
  P(2, 'Raspberry Pi Pico W', 'Boards', 159000, 60, 4.6, 932, 'RP2040 board with onboard WiFi, a good first board for MicroPython.', ['Dual-core Arm Cortex-M0+ at 133 MHz', 'Onboard 2.4 GHz WiFi', '26 GPIO pins, 3 ADC inputs', 'Programmable I/O (PIO) state machines']),
  P(3, 'Arduino Uno R4 WiFi', 'Boards', 649000, 18, 4.5, 411, 'The classic Uno form factor with a 32-bit Renesas MCU and an ESP32-S3 for connectivity.', ['Renesas RA4M1, 48 MHz', 'Built-in 12x8 LED matrix', 'Qwiic connector', 'Compatible with Uno shields']),
  P(4, 'STM32 Nucleo-64 F446RE', 'Boards', 399000, 9, 4.8, 276, 'Cortex-M4F development board with an onboard ST-LINK debugger.', ['STM32F446RE, 180 MHz, FPU', 'Onboard ST-LINK/V2-1', 'Arduino Uno V3 and ST morpho headers', 'Supported by STM32CubeIDE and FreeRTOS']),
  P(5, 'DHT22 Temperature & Humidity Sensor', 'Sensors', 79000, 120, 4.3, 2210, 'Digital sensor with calibrated output for indoor monitoring.', ['Humidity 0-100% RH, temperature -40 to 80 °C', 'Single-wire digital output', '3.3-5 V supply', 'One reading every 2 seconds']),
  P(6, 'BME280 Pressure, Temperature & Humidity Module', 'Sensors', 95000, 75, 4.6, 640, 'Three environmental sensors in one small I2C/SPI breakout.', ['Pressure 300-1100 hPa', 'I2C and SPI interfaces', 'Low power for battery nodes', '3.3 V logic']),
  P(7, 'HC-SR501 PIR Motion Sensor', 'Sensors', 29000, 200, 4.2, 3105, 'Passive infrared sensor for presence detection and alarms.', ['Detection range up to 7 m', 'Adjustable delay and sensitivity', '5-20 V supply', 'Digital output pin']),
  P(8, 'MQ-135 Air Quality Sensor', 'Sensors', 45000, 5, 4.1, 518, 'Gas sensor for ammonia, benzene, smoke and CO2-equivalent monitoring.', ['Analog and digital outputs', 'Needs a short warm-up period', '5 V supply', 'Calibrate before use']),
  P(9, 'LoRa SX1278 433 MHz Module', 'Wireless', 129000, 33, 4.4, 387, 'Long-range, low-power radio for sensor networks without WiFi.', ['Range of several km in open air', 'SPI interface', '433 MHz band', 'Works with the Arduino LoRa library']),
  P(10, 'MFRC522 RFID Reader Module (13.56 MHz)', 'Wireless', 49000, 0, 4.5, 1190, 'RFID reader/writer with a card and key fob for access-control projects.', ['Reads MIFARE 1K cards', 'SPI interface', '3.3 V logic', 'Includes 1 card and 1 key fob']),
  P(11, '4-Channel 5V Relay Module', 'Actuators', 55000, 88, 4.4, 1740, 'Opto-isolated relays to switch lamps, pumps and other mains loads from a microcontroller.', ['4 channels, 10 A / 250 VAC contacts', 'Optocoupler isolation', 'Active-low trigger', 'Status LED per channel']),
  P(12, 'SSD1306 0.96" OLED Display (I2C)', 'Displays', 59000, 150, 4.6, 2860, 'Compact 128x64 monochrome OLED for sensor readouts and menus.', ['128x64 pixels, I2C', 'Self-lit, high contrast', '3.3-5 V supply', 'Adafruit_SSD1306 and U8g2 libraries']),
];

const TUTORIALS = [
  { id: 't1', productId: '1', title: 'Blink an LED on ESP32-S3 with Arduino IDE', level: 'Beginner', minutes: 10, summary: 'Install the board package, upload your first sketch and check the serial monitor.' },
  { id: 't2', productId: '1', title: 'Publish sensor data over MQTT from an ESP32', level: 'Intermediate', minutes: 25, summary: 'Connect to WiFi, reach a broker and publish JSON readings every few seconds.' },
  { id: 't3', productId: '5', title: 'Read temperature and humidity with a DHT22', level: 'Beginner', minutes: 15, summary: 'Wire the sensor, read values and handle failed readings.' },
  { id: 't4', productId: '12', title: 'Show sensor readings on an SSD1306 OLED', level: 'Beginner', minutes: 20, summary: 'Draw text and simple graphics over I2C.' },
  { id: 't5', productId: '10', title: 'Build a door lock with MFRC522 and a relay', level: 'Intermediate', minutes: 40, summary: 'Read card UIDs and switch a relay for authorized cards.' },
  { id: 't6', productId: '4', title: 'Blink with FreeRTOS tasks on STM32 Nucleo', level: 'Intermediate', minutes: 30, summary: 'Create two tasks with CubeIDE and share a queue.' },
];

// ---- users ----
const users = () => {
  const list = read('mqtt_mock_users', []);
  if (!list.length) {
    list.push({ id: 'u1', name: 'Demo User', email: 'demo@mqtt.dev', password: 'demo1234', role: 'user' });
    write('mqtt_mock_users', list);
  }
  return list;
};
const publicUser = ({ password, ...u }) => u;
const tokenFor = (u) => `mock.${u.id}`;
function currentUser() {
  const u = users().find((x) => tokenFor(x) === getToken());
  if (!u) throw fail('Please sign in', 401);
  return u;
}

export async function login(email, password) {
  await delay();
  const u = users().find((x) => x.email === email.trim().toLowerCase() && x.password === password);
  if (!u) throw fail('Invalid email or password', 401);
  return { token: tokenFor(u), user: publicUser(u) };
}
export async function register({ name, email, password }) {
  await delay();
  const list = users();
  const mail = email.trim().toLowerCase();
  if (list.some((u) => u.email === mail)) throw fail('This email is already registered', 409);
  const u = { id: `u${Date.now()}`, name, email: mail, password, role: 'user' };
  write('mqtt_mock_users', [...list, u]);
  return { token: tokenFor(u), user: publicUser(u) };
}
export async function me() {
  await delay(50);
  return publicUser(currentUser());
}

// ---- products & tutorials ----
export async function listProducts({ q, category } = {}) {
  await delay();
  const term = (q || '').trim().toLowerCase();
  return PRODUCTS.filter(
    (p) =>
      (!category || p.category === category) &&
      (!term || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(term)),
  );
}
export async function getProduct(id) {
  await delay(80);
  const p = PRODUCTS.find((x) => x.id === String(id));
  if (!p) throw fail('Product not found', 404);
  return p;
}
export async function getTutorialsByProduct(productId) {
  await delay(80);
  return TUTORIALS.filter((t) => t.productId === String(productId));
}

// ---- cart ----
const cartKey = () => `mqtt_mock_cart:${currentUser().id}`;
export async function getCart() {
  await delay(60);
  return read(cartKey(), []).map((i) => ({ ...i, product: PRODUCTS.find((p) => p.id === i.productId) }));
}
export async function addCartItem(productId, quantity = 1) {
  await delay(60);
  const key = cartKey();
  const cart = read(key, []);
  const existing = cart.find((i) => i.productId === String(productId));
  if (existing) existing.quantity += quantity;
  else cart.push({ id: `ci${Date.now()}`, productId: String(productId), quantity });
  write(key, cart);
}
export async function updateCartItem(itemId, quantity) {
  await delay(60);
  const key = cartKey();
  write(key, read(key, []).map((i) => (i.id === itemId ? { ...i, quantity } : i)));
}
export async function removeCartItem(itemId) {
  await delay(60);
  const key = cartKey();
  write(key, read(key, []).filter((i) => i.id !== itemId));
}

// ---- orders (mirrors order-service behaviour) ----
export async function createOrder(shipping) {
  await delay(500);
  const user = currentUser();
  const cart = read(cartKey(), []);
  if (!cart.length) throw fail('Cart is empty');
  const items = cart.map((i) => {
    const p = PRODUCTS.find((x) => x.id === i.productId);
    if (p.stock < i.quantity) throw fail(`Not enough stock for "${p.name}"`, 409);
    return { id: `oi${Math.random().toString(36).slice(2)}`, productId: p.id, productName: p.name, unitPrice: p.price, quantity: i.quantity };
  });
  const order = {
    id: crypto.randomUUID(),
    userId: user.id,
    status: 'PAID',
    totalAmount: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    ...shipping,
    items,
    createdAt: new Date().toISOString(),
  };
  write('mqtt_mock_orders', [order, ...read('mqtt_mock_orders', [])]);
  write(cartKey(), []);
  return order;
}
export async function listOrders() {
  await delay();
  const user = currentUser();
  return read('mqtt_mock_orders', []).filter((o) => o.userId === user.id);
}
export async function cancelOrder(id) {
  await delay();
  const user = currentUser();
  const orders = read('mqtt_mock_orders', []);
  const order = orders.find((o) => o.id === id && o.userId === user.id);
  if (!order) throw fail('Order not found', 404);
  if (!['PENDING', 'PAYMENT_FAILED', 'PAID'].includes(order.status)) {
    throw fail(`Orders with status ${order.status} cannot be cancelled`, 409);
  }
  order.status = 'CANCELLED';
  write('mqtt_mock_orders', orders);
  return order;
}
