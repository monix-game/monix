interface ResourceInfo {
    id: string,
    icon: string,
    name: string,
    unit: string
}

const resources: ResourceInfo[] = [
    {
        id: "avocado",
        icon: "🥑",
        name: "Avocados",
        unit: "kg"
    },
    {
        id: "bacon",
        icon: "🥓",
        name: "Bacon",
        unit: "kg"
    },
    {
        id: "bagel",
        icon: "🥯",
        name: "Bagels",
        unit: "kg"
    },
    {
        id: "banana",
        icon: "🍌",
        name: "Bananas",
        unit: "kg"
    },
    {
        id: "bread",
        icon: "🍞",
        name: "Bread",
        unit: "kg"
    },
    {
        id: "cake",
        icon: "🍰",
        name: "Cake",
        unit: "kg"
    },
    {
        id: "corn",
        icon: "🌽",
        name: "Corn",
        unit: "kg"
    },
    {
        id: "diamond",
        icon: "💎",
        name: "Diamond",
        unit: "carats"
    },
    {
        id: "gas",
        icon: "🔥",
        name: "Natural Gas",
        unit: "m³"
    },
    {
        id: "gold",
        icon: "🪙",
        name: "Gold",
        unit: "kg"
    },
    {
        id: "lemon",
        icon: "🍋",
        name: "Lemons",
        unit: "kg"
    },
    {
        id: "oil",
        icon: "🛢️",
        name: "Oil",
        unit: "litres"
    },
    {
        id: "silver",
        icon: "💍",
        name: "Silver",
        unit: "kg"
    }
];

export { resources };
export type { ResourceInfo };
