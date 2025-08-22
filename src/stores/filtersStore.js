import { writable, derived } from "svelte/store";

// Store for the complete dataset
export const completeDataset = writable([]);

// Store for filtered data
export const filteredDataset = writable([]);

// Store for active filters
export const activeFilters = writable([]);

// Store for filter state
export const filtersEnabled = writable(false);

// Derived store that provides the current dataset to use
export const currentDataset = derived(
	[filteredDataset, completeDataset, filtersEnabled],
	([$filteredDataset, $completeDataset, $filtersEnabled]) => {
		return $filtersEnabled && $filteredDataset.length > 0 
			? $filteredDataset 
			: $completeDataset;
	}
);

// Helper function to update filtered data
export function updateFilteredData(filteredData, filters) {
	filteredDataset.set(filteredData);
	activeFilters.set(filters);
	filtersEnabled.set(filters.length > 0);
}