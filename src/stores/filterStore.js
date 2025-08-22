import { writable, derived } from 'svelte/store';

// Store for all original instances (unfiltered)
export const allInstances = writable([]);

// Store for currently filtered instances
export const filteredInstances = writable([]);

// Store for active filter state
export const activeFilters = writable([]);

// Store for filter panel expanded state
export const filtersExpanded = writable(false);

// Derived store to check if any filters are active
export const hasActiveFilters = derived(
	activeFilters,
	($activeFilters) => $activeFilters.length > 0
);

// Helper function to update filtered data
export function updateFilteredData(instances, filters = []) {
	filteredInstances.set(instances);
	activeFilters.set(filters);
}

// Helper function to reset filters
export function resetFilters() {
	// Get all instances and reset to unfiltered state
	allInstances.subscribe(instances => {
		filteredInstances.set(instances);
	})();
	activeFilters.set([]);
}