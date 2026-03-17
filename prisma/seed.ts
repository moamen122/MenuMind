// Load .env from current working directory (run "npx prisma db seed" from backend folder)
require("dotenv").config();

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";

async function main() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1. Demo user (password: demo123)
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@menumind.com" },
    update: { password: hashedPassword },
    create: {
      email: "demo@menumind.com",
      password: hashedPassword,
      role: "OWNER",
    },
  });
  console.log("Created demo user:", demoUser.email);

  // 2. Demo restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Bistro",
      ownerId: demoUser.id,
    },
  });
  console.log("Created restaurant:", restaurant.name);

  // 3. Restaurant member (owner link)
  await prisma.restaurantMember.upsert({
    where: {
      userId_restaurantId: { userId: demoUser.id, restaurantId: restaurant.id },
    },
    update: {},
    create: {
      userId: demoUser.id,
      restaurantId: restaurant.id,
      role: "OWNER",
    },
  });

  // 4. Sample menu
  const menu = await prisma.menu.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      restaurantId: restaurant.id,
      name: "Main Menu",
    },
  });
  console.log("Created menu:", menu.name);

  // 5. Menu categories
  const starters = await prisma.menuCategory.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      menuId: menu.id,
      name: "Starters",
      sortOrder: 0,
    },
  });
  const mains = await prisma.menuCategory.upsert({
    where: { id: "00000000-0000-0000-0000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      menuId: menu.id,
      name: "Main Courses",
      sortOrder: 1,
    },
  });

  // 6. Ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.upsert({
      where: { id: "00000000-0000-0000-0000-000000000020" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000020",
        restaurantId: restaurant.id,
        name: "Tomatoes",
        unit: "g",
      },
    }),
    prisma.ingredient.upsert({
      where: { id: "00000000-0000-0000-0000-000000000021" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000021",
        restaurantId: restaurant.id,
        name: "Mozzarella",
        unit: "g",
      },
    }),
    prisma.ingredient.upsert({
      where: { id: "00000000-0000-0000-0000-000000000022" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000022",
        restaurantId: restaurant.id,
        name: "Chicken Breast",
        unit: "g",
      },
    }),
    prisma.ingredient.upsert({
      where: { id: "00000000-0000-0000-0000-000000000023" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000023",
        restaurantId: restaurant.id,
        name: "Pasta",
        unit: "g",
      },
    }),
    prisma.ingredient.upsert({
      where: { id: "00000000-0000-0000-0000-000000000024" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000024",
        restaurantId: restaurant.id,
        name: "Olive Oil",
        unit: "ml",
      },
    }),
  ]);
  console.log("Created ingredients:", ingredients.length);

  // 7. Menu items (5 items) with sizes and ingredient relationships
  const caprese = await prisma.menuItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000030" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000030",
      menuId: menu.id,
      categoryId: starters.id,
      name: "Caprese Salad",
      description: "Fresh mozzarella, tomatoes, basil, balsamic glaze",
    },
  });
  await prisma.menuItemSize.upsert({
    where: { id: "00000000-0000-0000-0000-000000000040" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000040",
      menuItemId: caprese.id,
      name: "Default",
      price: 8.99,
      sortOrder: 0,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: caprese.id,
        ingredientId: ingredients[0].id,
      },
    },
    update: {},
    create: {
      menuItemId: caprese.id,
      ingredientId: ingredients[0].id,
      quantity: 150,
      unitPrice: 0.02,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: caprese.id,
        ingredientId: ingredients[1].id,
      },
    },
    update: {},
    create: {
      menuItemId: caprese.id,
      ingredientId: ingredients[1].id,
      quantity: 100,
      unitPrice: 0.03,
    },
  });

  const chickenPasta = await prisma.menuItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000031" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000031",
      menuId: menu.id,
      categoryId: mains.id,
      name: "Chicken Pasta",
      description: "Grilled chicken breast with penne and tomato sauce",
    },
  });
  await prisma.menuItemSize.upsert({
    where: { id: "00000000-0000-0000-0000-000000000041" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000041",
      menuItemId: chickenPasta.id,
      name: "Default",
      price: 14.99,
      sortOrder: 0,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: chickenPasta.id,
        ingredientId: ingredients[2].id,
      },
    },
    update: {},
    create: {
      menuItemId: chickenPasta.id,
      ingredientId: ingredients[2].id,
      quantity: 200,
      unitPrice: 0.04,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: chickenPasta.id,
        ingredientId: ingredients[3].id,
      },
    },
    update: {},
    create: {
      menuItemId: chickenPasta.id,
      ingredientId: ingredients[3].id,
      quantity: 250,
      unitPrice: 0.01,
    },
  });

  const bruschetta = await prisma.menuItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000032" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000032",
      menuId: menu.id,
      categoryId: starters.id,
      name: "Bruschetta",
      description: "Toasted bread with tomato, garlic, and basil",
    },
  });
  await prisma.menuItemSize.upsert({
    where: { id: "00000000-0000-0000-0000-000000000042" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000042",
      menuItemId: bruschetta.id,
      name: "Default",
      price: 6.99,
      sortOrder: 0,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: bruschetta.id,
        ingredientId: ingredients[0].id,
      },
    },
    update: {},
    create: {
      menuItemId: bruschetta.id,
      ingredientId: ingredients[0].id,
      quantity: 100,
      unitPrice: 0.02,
    },
  });

  const grilledChicken = await prisma.menuItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000033" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000033",
      menuId: menu.id,
      categoryId: mains.id,
      name: "Grilled Chicken",
      description: "Herb-marinated chicken breast with seasonal vegetables",
    },
  });
  await prisma.menuItemSize.upsert({
    where: { id: "00000000-0000-0000-0000-000000000043" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000043",
      menuItemId: grilledChicken.id,
      name: "Default",
      price: 16.99,
      sortOrder: 0,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: grilledChicken.id,
        ingredientId: ingredients[2].id,
      },
    },
    update: {},
    create: {
      menuItemId: grilledChicken.id,
      ingredientId: ingredients[2].id,
      quantity: 300,
      unitPrice: 0.04,
    },
  });

  const tomatoPasta = await prisma.menuItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000034" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000034",
      menuId: menu.id,
      categoryId: mains.id,
      name: "Tomato Pasta",
      description: "Classic penne in fresh tomato and basil sauce",
    },
  });
  await prisma.menuItemSize.upsert({
    where: { id: "00000000-0000-0000-0000-000000000044" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000044",
      menuItemId: tomatoPasta.id,
      name: "Default",
      price: 11.99,
      sortOrder: 0,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: tomatoPasta.id,
        ingredientId: ingredients[3].id,
      },
    },
    update: {},
    create: {
      menuItemId: tomatoPasta.id,
      ingredientId: ingredients[3].id,
      quantity: 300,
      unitPrice: 0.01,
    },
  });
  await prisma.menuItemIngredient.upsert({
    where: {
      menuItemId_ingredientId: {
        menuItemId: tomatoPasta.id,
        ingredientId: ingredients[4].id,
      },
    },
    update: {},
    create: {
      menuItemId: tomatoPasta.id,
      ingredientId: ingredients[4].id,
      quantity: 20,
      unitPrice: 0.005,
    },
  });

  console.log("Created 5 menu items with ingredient relationships.");
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
