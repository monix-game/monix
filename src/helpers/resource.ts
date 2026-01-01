import type { ResourceInfo } from "../resources";

export function getPrice(resource: ResourceInfo): number | null {
    return resource.icon.length; // Placeholder implementation
}

export function getQuantity(resource: ResourceInfo): number | null {
    return resource ? 1 : null; // Placeholder implementation
}
