import { avocado, bacon, bagel, banana, bread, cake, corn, gas, gold, lemon, oil, silver } from './assets/resources'

interface ResourceInfo {
    id: string,
    icon: string,
    name: string,
    unit: string
}

const resources: ResourceInfo[] = [
    {
        id: "avocado",
        icon: avocado,
        name: "Avocado",
        unit: "kg"
    },
    {
        id: "bacon",
        icon: bacon,
        name: "Bacon",
        unit: "kg"
    },
    {
        id: "bagel",
        icon: bagel,
        name: "Bagel",
        unit: "kg"
    },
    {
        id: "banana",
        icon: banana,
        name: "Banana",
        unit: "kg"
    },
    {
        id: "bread",
        icon: bread,
        name: "Bread",
        unit: "kg"
    },
    {
        id: "cake",
        icon: cake,
        name: "Cake",
        unit: "kg"
    },
    {
        id: "corn",
        icon: corn,
        name: "Corn",
        unit: "kg"
    },
    {
        id: "gas",
        icon: gas,
        name: "Natural Gas",
        unit: "m³"
    },
    {
        id: "gold",
        icon: gold,
        name: "Gold",
        unit: "kg"
    },
    {
        id: "lemon",
        icon: lemon,
        name: "Lemon",
        unit: "kg"
    },
    {
        id: "oil",
        icon: oil,
        name: "Oil",
        unit: "L"
    },
    {
        id: "silver",
        icon: silver,
        name: "Silver",
        unit: "kg"
    }
];

export { resources };
export type { ResourceInfo };
