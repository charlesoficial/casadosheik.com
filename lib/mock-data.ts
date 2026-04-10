import type { AdminOrder, CartItem, MenuProduct, RestaurantConfig } from "@/lib/types";

export const restaurant: RestaurantConfig = {
  name: "Casa do Sheik",
  cuisine: "Culinaria Arabe",
  welcome:
    "Sabores do Levante, pratos generosos e um fluxo de pedido pensado para mesa e delivery.",
  open: true,
  whatsapp: "(64) 99955-9916",
  logoUrl: "/logo.png"
};

export const categories = [
  "Almoco arabe",
  "Pastas",
  "Esfihas",
  "Shawarmas",
  "Kibe Cru",
  "Combos",
  "Saladas",
  "Porcoes",
  "Bebidas"
];

export const products: MenuProduct[] = [
  {
    id: "1",
    category: "Almoco arabe",
    name: "Prato Kafta Arabe",
    description: "Duas kaftas, arroz sirio, hommus e salada fattoush.",
    price: 60,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    badge: "Destaque"
  },
  {
    id: "2",
    category: "Almoco arabe",
    name: "Prato Shish Tawook",
    description: "Espetos de tawook, arroz sirio e babaganoush.",
    price: 56,
    image:
      "https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "3",
    category: "Pastas",
    name: "Hommus Tradicional",
    description: "Pasta de grao-de-bico com tahine, azeite e pao arabe.",
    price: 24,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "4",
    category: "Esfihas",
    name: "Esfiha de Carne",
    description: "Esfiha aberta com carne temperada e toque de limao.",
    price: 9.5,
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "5",
    category: "Shawarmas",
    name: "Shawarma de Frango",
    description: "Frango marinado, picles, alho cremoso e fritas.",
    price: 31,
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "6",
    category: "Combos",
    name: "Combo Sheik",
    description: "2 shawarmas, 2 refrigerantes e porcao de fritas.",
    price: 74,
    image:
      "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "7",
    category: "Saladas",
    name: "Fattoush",
    description: "Mix de folhas, tomate, pepino, sumac e torradas de pao.",
    price: 28,
    image:
      "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "8",
    category: "Porcoes",
    name: "Kibe Frito",
    description: "Porcao com 8 unidades de kibe dourado e limao.",
    price: 34,
    image:
      "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "9",
    category: "Bebidas",
    name: "Refrigerante 600ml",
    description: "Coca-Cola, Guarana Antarctica ou Soda.",
    price: 8,
    image:
      "https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80"
  }
];

export const sampleCart: CartItem[] = [
  { id: "demo-cart-1", productId: "1", name: "Prato Kafta Arabe", qty: 1, price: 60, image: products[0].image },
  { id: "demo-cart-2", productId: "5", name: "Shawarma de Frango", qty: 2, price: 31, image: products[4].image }
];

export const adminOrders: AdminOrder[] = [
  {
    id: "ped-0042",
    number: 42,
    type: "Mesa 7",
    customer: "Salao principal",
    status: "novo",
    total: 122,
    items: ["1x Prato Kafta Arabe", "2x Shawarma de Frango"],
    minutesAgo: 3
  },
  {
    id: "ped-0041",
    number: 41,
    type: "Delivery",
    customer: "Matheus Samuel",
    status: "aceito",
    total: 74,
    items: ["1x Combo Sheik", "1x Hommus Tradicional"],
    minutesAgo: 11
  },
  {
    id: "ped-0040",
    number: 40,
    type: "Retirada",
    customer: "Washington Nascimento",
    status: "preparo",
    total: 59,
    items: ["2x Esfiha de Carne", "1x Kibe Frito"],
    minutesAgo: 18
  },
  {
    id: "ped-0039",
    number: 39,
    type: "Mesa 3",
    customer: "Varanda",
    status: "pronto",
    total: 88,
    items: ["1x Fattoush", "2x Refrigerante 600ml"],
    minutesAgo: 27
  }
];
