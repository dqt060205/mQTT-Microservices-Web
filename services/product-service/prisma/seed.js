import 'dotenv/config';
import prisma from '../src/config/prisma.js';

const categories = [
  {
    name: 'Development Boards',
    slug: 'development-boards',
    description: 'Boards for prototyping and building IoT applications.'
  },
  {
    name: 'Sensors',
    slug: 'sensors',
    description: 'Sensors for temperature, humidity, motion, light and more.'
  },
  {
    name: 'Connectivity',
    slug: 'connectivity',
    description: 'Modules for Wi-Fi, Bluetooth, LoRa and cellular connectivity.'
  }
];

async function main() {
  const savedCategories = {};

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
    savedCategories[category.slug] = saved;
  }

  const products = [
    {
      name: 'ESP32 Development Board',
      slug: 'esp32-development-board',
      sku: 'MQTT-ESP32-001',
      description: 'Dual-core Wi-Fi and Bluetooth development board for IoT prototypes.',
      price: '12.90',
      stock: 50,
      imageUrl: 'https://images.example.com/products/esp32.jpg',
      categoryId: savedCategories['development-boards'].id
    },
    {
      name: 'DHT22 Temperature and Humidity Sensor',
      slug: 'dht22-temperature-humidity-sensor',
      sku: 'MQTT-DHT22-001',
      description: 'Digital temperature and humidity sensor with a calibrated output.',
      price: '8.50',
      stock: 80,
      imageUrl: 'https://images.example.com/products/dht22.jpg',
      categoryId: savedCategories.sensors.id
    },
    {
      name: 'LoRa SX1278 Module',
      slug: 'lora-sx1278-module',
      sku: 'MQTT-LORA-001',
      description: 'Long-range low-power wireless transceiver module.',
      price: '9.75',
      stock: 35,
      imageUrl: 'https://images.example.com/products/lora-sx1278.jpg',
      categoryId: savedCategories.connectivity.id
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product
    });
  }
}

main()
  .then(() => {
    console.log('Product service seed completed.');
  })
  .catch((error) => {
    console.error('Product service seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
