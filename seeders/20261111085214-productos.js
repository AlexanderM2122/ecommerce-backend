
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('producto', [
      {
        id: 1,
        titulo: 'Televisor OLED Smart TV LG 42" 4K UHD',
        descripcion: "El Televisor OLED Smart TV LG 42 pulgadas 4K UHD TV OLED42C3PSA 2023 es un producto de última tecnología que te permitirá disfrutar de una experiencia visual inigualable. Este modelo cuenta con una pantalla OLED de 42 pulgadas con resolución 4K UHD, lo que te permitirá ver tus contenidos favoritos con una calidad de imagen excepcional.",
        precio: 13888,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 2,
        titulo: 'Xiaomi Poco M5s 8GB 256GB AMOLED',
        descripcion: "Pantalla AMOLED 6.43, Full HD+. Cámara cuádruple de 64 Mpx. Batería de 5000 mAh con carga rápida. El Xiaomi Poco M5s ofrece una excelente experiencia de uso, con gran capacidad de almacenamiento, rendimiento y calidad de imagen.",
        precio: 2399,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 3,
        titulo: 'Apple MacBook Air 13 pulgadas M1 256GB',
        descripcion: "La notebook más delgada y ligera de Apple viene con los superpoderes del chip M1. Termina todos tus proyectos mucho más rápido con el CPU de 8 núcleos y disfruta como nunca antes de apps y juegos con gráficos avanzados gracias al GPU de hasta 8 núcleos. Además, el Neural Engine de 16 núcleos se encarga de acelerar todos los procesos de aprendizaje automático.",
        precio: 25999,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 4,
        titulo: 'Hisense Taurus Licuadora Vaso Plástico 1.25 Litros',
        descripcion: "HALLEY de TAURUS es la combinación ideal de potencia y funcionalidad. Con 350 Watts de potencia, podrás preparar cualquier receta y, gracias a sus 4 velocidades (2 continuas y 2 pulsos), elegir el grado de molienda de tus alimentos. Ideal para preparar desde una tersa crema hasta una salsa tipo martajada o un smoothie para comenzar el día.",
        precio: 849,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 5,
        titulo: 'Silla De Escritorio Ejecutiva Ergonómica Stryka',      
        descripcion: "La selección de una silla adecuada es crucial para prevenir lesiones futuras. Con esta silla Stryka, disfrutarás de la comodidad y el bienestar necesarios durante tu jornada laboral. Su diseño permite que se integre fácilmente en cualquier espacio de tu casa u oficina, aportando un estilo moderno.",
        precio: 1957,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 6,
        titulo: 'Bolsa Andrea Para Mujer Grabado Cocodrilo Doble Asa',
        descripcion: "Esta bolsa no solo es llamativa y elegante, sino que también ofrece una sensación táctil excepcional gracias a su textura increíble.",
        precio: 427,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 7,
        titulo: 'Balón Futbol Forza Laminado F5 Molten',
        descripcion: "Encuentra en el FG-1500 la calidad e innovación que Molten puede brindar. Disfruta de tus momentos de entrenamiento y juego, así como de diversión, con una pelota que es ideal para ti.",
        precio: 521.82,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 8,
        titulo: 'Cámara De Papel De Interiores Cristal Decorativa',
        descripcion: "Disfruta el entretenimiento en casa con este juego de bloques. Este sencillo juego de apilamiento está hecho de madera, más bonito y con mejor resistencia de la que esperabas.",
        precio: 241.6,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 9,
        titulo: 'Trituradora Papel Gbc Corte Cruzado Hasta 12 Hojas',
        descripcion: "Protege tu privacidad destruyendo los documentos que contengan información confidencial con la Destructora Momentum PX12-06. Gracias a su corte cruzado, tritura cada documento en pequeñas tiras, evitando que tus datos caigan en manos equivocadas.",
        precio: 4646.8,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 10,
        titulo: 'Play-doh Moto Scooter Repartidora De Pizzas',
        descripcion: "¡Bip, bip! Aquí viene la Moto Repartidora de Pizzas. No es solamente una moto para niños y niñas de 3 a 5 años. Es, además, un juguete Play-Doh con temática de pizzas que les permitirá crear y repartir su propia comida de juguete.",
        precio: 299.9,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 11,
        titulo: 'Silla Alta Para Comer 5 En 1 Periquera Bebé Niños',
        descripcion: "Una silla alta tipo periquera es la mejor forma de permitir a los pequeños compartir la hora de la comida contigo y tu familia. Deja que tu bebé se siente a la mesa y tome confianza para aprender a alimentarse por sí mismo. Incluye bandeja para comer desmontable y arnés de seguridad.",
        precio: 1999,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 12,
        titulo: 'Báscula Digital Renpho Negra Hasta 180 Kg',
        descripcion: "El peso corporal muestra en la báscula otros datos de composición corporal, incluidos el peso, el IMC y el porcentaje de grasa corporal almacenados en la aplicación.",
        precio: 328.11,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 13,
        titulo: 'Labial Líquido Mac Powder Kiss',
        descripcion: "Sé protagonista con la ayuda del labial MAC. Para el día o la noche, con un nude delicado o un rojo vibrante, vive el color sin necesidad de retoques. ¡Son perfectos para cualquier ocasión!",
        precio: 559,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 14,
        titulo: 'Videojuego Mario Kart 8 Deluxe Nintendo Switch Físico',
        descripcion: "¡Acelera a través de las pistas del Reino Champiñón, bajo el agua, en el cielo, de cabeza y sin gravedad, y llega a la meta para obtener la victoria! Prepara motores en el modo multijugador local, en los torneos en línea del juego, en el modo batalla que ha sido mejorado y más.",
        precio: 849,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 15,
        titulo: 'Café Soluble Nescafé Taster Choice Colombiano 190gr',        
        descripcion: "Nescafé Taster's Choice Colombiano ofrece una experiencia sensorial única, proporcionando un balance perfecto en cada taza. Elaborado con altos estándares de calidad y una mezcla de granos únicos, este café soluble mantiene un sabor, aroma y cuerpo distintivos gracias a su proceso de liofilización, que resalta las notas más puras del café al evitar el uso de altas temperaturas.",
        precio: 232.10,
        createdAt: new Date(), updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('producto', null, {});
  }
};
