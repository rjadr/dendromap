<script>
	import { createEventDispatcher } from 'svelte';
	import Label from "./sidebarComponents/Label.svelte";
	import Switch from "./sidebarComponents/Switch.svelte";

	const dispatch = createEventDispatcher();

	export let allInstances = []; // All leaf nodes data
	export let expanded = false;

	// Specific fields we want to filter
	const targetFields = [
		{ key: 'avg_likes', label: 'Average Likes', dataKey: 'avg_likes', step: 1 },
		{ key: 'avg_comments', label: 'Average Comments', dataKey: 'avg_comments', step: 1 },
		{ key: 'avg_views', label: 'Average Views', dataKey: 'avg_views', step: 1 },
		{ key: 'avg_interactions', label: 'Average Interactions', dataKey: 'avg_interactions', step: 1 },
		{ key: 'avg_overperforming_score', label: 'Average Overperforming Score', dataKey: 'avg_overperforming_score', step: 0.01 }
	];

	// Data ranges computed from actual dataset
	let dataRanges = {};
	let filters = {};
	let manualRanges = {};
	let availableFields = [];

	// Initialize data structures
	function initializeFilters() {
		const newDataRanges = {};
		const newFilters = {};
		const newManualRanges = {};

		targetFields.forEach(field => {
			newDataRanges[field.key] = { min: Infinity, max: -Infinity, count: 0 };
			newFilters[field.key] = { min: 0, max: 100, enabled: false };
			newManualRanges[field.key] = { min: '', max: '' };
		});

		// Add date fields
		newDataRanges['post_created'] = { min: null, max: null, count: 0 };
		newFilters['post_created'] = { start: '', end: '', enabled: false };

		dataRanges = newDataRanges;
		filters = newFilters;
		manualRanges = newManualRanges;
	}

	// Compute actual min/max values from the dataset
	function computeDataRanges(instances) {
		if (!instances || instances.length === 0) return;

		console.log("Computing data ranges from", instances.length, "instances");
		console.log("Sample instance keys:", Object.keys(instances[0] || {}));
		
		// Initialize if not done already
		if (Object.keys(dataRanges).length === 0) {
			initializeFilters();
		}

		// Reset counts
		Object.keys(dataRanges).forEach(key => {
			if (dataRanges[key].min !== null) {
				dataRanges[key] = { min: Infinity, max: -Infinity, count: 0 };
			} else {
				dataRanges[key] = { min: null, max: null, count: 0 };
			}
		});

		// Track which fields are actually available
		const newAvailableFields = [];

		instances.forEach(instance => {
			// Process target numerical fields
			targetFields.forEach(field => {
				const value = instance[field.dataKey];
				if (value !== undefined && value !== null && !isNaN(parseFloat(value))) {
					const numValue = parseFloat(value);
					dataRanges[field.key].min = Math.min(dataRanges[field.key].min, numValue);
					dataRanges[field.key].max = Math.max(dataRanges[field.key].max, numValue);
					dataRanges[field.key].count++;
				}
			});

			// Process date fields - check multiple possible field names
			const dateFieldCandidates = ['Post Created', 'post_created', 'Post_Created', 'created_at', 'date'];
			let dateValue = null;
			let dateFieldName = null;

			for (const fieldName of dateFieldCandidates) {
				if (instance[fieldName]) {
					dateValue = instance[fieldName];
					dateFieldName = fieldName;
					break;
				}
			}

			if (dateValue) {
				try {
					const date = new Date(dateValue);
					if (!isNaN(date.getTime())) {
						if (!dataRanges['post_created'].min || date < dataRanges['post_created'].min) {
							dataRanges['post_created'].min = date;
						}
						if (!dataRanges['post_created'].max || date > dataRanges['post_created'].max) {
							dataRanges['post_created'].max = date;
						}
						dataRanges['post_created'].count++;
					}
				} catch (e) {
					// Invalid date, skip
				}
			}
		});

		// Update available fields and filter ranges
		targetFields.forEach(field => {
			if (dataRanges[field.key].count > 0 && dataRanges[field.key].min !== Infinity) {
				newAvailableFields.push(field);
				filters[field.key].min = dataRanges[field.key].min;
				filters[field.key].max = dataRanges[field.key].max;
				manualRanges[field.key].min = dataRanges[field.key].min.toString();
				manualRanges[field.key].max = dataRanges[field.key].max.toString();
			}
		});

		// Handle date field
		if (dataRanges['post_created'].count > 0 && dataRanges['post_created'].min) {
			filters['post_created'].start = dataRanges['post_created'].min.toISOString().split('T')[0];
			filters['post_created'].end = dataRanges['post_created'].max.toISOString().split('T')[0];
			newAvailableFields.push({ key: 'post_created', label: 'Post Date', dataKey: 'post_created' });
		}

		availableFields = newAvailableFields;

		console.log("Available fields:", availableFields);
		console.log("Data ranges:", dataRanges);
	}

	// Apply manual range changes
	function applyManualRange(fieldKey) {
		const minVal = parseFloat(manualRanges[fieldKey].min);
		const maxVal = parseFloat(manualRanges[fieldKey].max);
		
		if (!isNaN(minVal) && !isNaN(maxVal) && minVal <= maxVal) {
			dataRanges[fieldKey].min = minVal;
			dataRanges[fieldKey].max = maxVal;
			filters[fieldKey].min = minVal;
			filters[fieldKey].max = maxVal;
		}
	}

	// Reset manual range to data range
	function resetManualRange(fieldKey) {
		computeDataRanges(allInstances);
	}

	// Apply filters and emit filtered data
	function applyFilters() {
		console.log("Applying filters:", filters);
		
		const filtered = allInstances.filter(instance => {
			// Check numerical filters
			for (const field of targetFields) {
				if (!filters[field.key] || !filters[field.key].enabled) continue;

				const value = parseFloat(instance[field.dataKey]) || 0;
				if (value < filters[field.key].min || value > filters[field.key].max) {
					return false;
				}
			}

			// Check date filter
			if (filters['post_created'] && filters['post_created'].enabled && 
				filters['post_created'].start && filters['post_created'].end) {
				
				const dateFieldCandidates = ['Post Created', 'post_created', 'Post_Created', 'created_at', 'date'];
				let dateValue = null;

				for (const fieldName of dateFieldCandidates) {
					if (instance[fieldName]) {
						dateValue = instance[fieldName];
						break;
					}
				}

				if (dateValue) {
					try {
						const postDate = new Date(dateValue);
						const startDate = new Date(filters['post_created'].start);
						const endDate = new Date(filters['post_created'].end);
						if (postDate < startDate || postDate > endDate) return false;
					} catch (e) {
						return false; // Invalid date
					}
				}
			}

			return true;
		});

		console.log("Filtered", allInstances.length, "down to", filtered.length, "instances");

		dispatch('filtersChanged', { 
			filteredInstances: filtered,
			activeFilters: Object.keys(filters).filter(key => filters[key]?.enabled)
		});
	}

	// Clear all filters
	function clearFilters() {
		Object.keys(filters).forEach(key => {
			if (filters[key]) {
				filters[key].enabled = false;
				// Reset to data range
				if (filters[key].min !== undefined) {
					filters[key].min = dataRanges[key]?.min || 0;
					filters[key].max = dataRanges[key]?.max || 100;
				}
			}
		});
		applyFilters();
	}

	// Format numbers for display
	function formatNumber(num) {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toString();
	}

	// Count active filters
	$: activeFilterCount = Object.values(filters).filter(f => f?.enabled).length;

	// Watch for data changes and recompute ranges
	$: if (allInstances.length > 0) {
		computeDataRanges(allInstances);
	}

	// Get numerical and date fields separately
	$: numericalFields = availableFields.filter(f => f.key !== 'post_created');
	$: dateFields = availableFields.filter(f => f.key === 'post_created');
</script>

<div class="filter-panel">
	<button 
		class="toggle-button" 
		on:click={() => expanded = !expanded}
	>
		<span class="toggle-icon" class:expanded>{expanded ? '▼' : '▶'}</span>
		Data Filters
		{#if activeFilterCount > 0}
			<span class="filter-count">({activeFilterCount} active)</span>
		{/if}
	</button>
	
	{#if expanded}
		<div class="filter-content">
			<div class="filter-header">
				<button class="clear-button" on:click={clearFilters} disabled={activeFilterCount === 0}>
					Clear All
				</button>
				<button class="apply-button" on:click={applyFilters}>
					Apply Filters
				</button>
			</div>

			<div class="filter-grid">
				<!-- Debug Info -->
				{#if availableFields.length === 0}
					<div class="debug-info">
						<p><strong>No filterable fields detected.</strong></p>
						<p>Looking for: avg_likes, avg_comments, avg_views, avg_interactions, avg_overperforming_score</p>
						<p>Available fields in data:</p>
						<div class="field-list">
							{#if allInstances.length > 0}
								{#each Object.keys(allInstances[0]) as field}
									<span class="field-tag">{field}</span>
								{/each}
							{/if}
						</div>
					</div>
				{/if}

				<!-- Numerical Filters with Range Sliders -->
				{#each numericalFields as filterConfig}
					{#if dataRanges[filterConfig.key] && dataRanges[filterConfig.key].count > 0}
					<div class="filter-section">
						<div class="filter-header-row">
							<div class="filter-enable">
								<Switch 
									bind:on={filters[filterConfig.key].enabled} 
									switchSize={20} 
									onColor="#0066cc"
								/>
								<span class="filter-label">{filterConfig.label}</span>
							</div>
							<div class="range-info">
								Data: {formatNumber(dataRanges[filterConfig.key].min)} - {formatNumber(dataRanges[filterConfig.key].max)}
							</div>
						</div>
						
						<div class="range-controls" class:disabled={!filters[filterConfig.key].enabled}>
							<!-- Manual Range Setting -->
							<div class="manual-range">
								<div class="range-inputs">
									<div class="range-input-group">
										<label>Min:</label>
										<input 
											type="number" 
											bind:value={manualRanges[filterConfig.key].min}
											step={filterConfig.step || 1}
											class="range-input"
											disabled={!filters[filterConfig.key].enabled}
										/>
									</div>
									<div class="range-input-group">
										<label>Max:</label>
										<input 
											type="number" 
											bind:value={manualRanges[filterConfig.key].max}
											step={filterConfig.step || 1}
											class="range-input"
											disabled={!filters[filterConfig.key].enabled}
										/>
									</div>
									<button 
										class="apply-range-btn"
										on:click={() => applyManualRange(filterConfig.key)}
										disabled={!filters[filterConfig.key].enabled}
										title="Apply custom range"
									>
										Set
									</button>
									<button 
										class="reset-range-btn"
										on:click={() => resetManualRange(filterConfig.key)}
										disabled={!filters[filterConfig.key].enabled}
										title="Reset to data range"
									>
										Reset
									</button>
								</div>
							</div>
							
							<!-- Range Slider -->
							<div class="slider-container">
								<div class="slider-values">
									<span>{formatNumber(filters[filterConfig.key].min)}</span>
									<span>{formatNumber(filters[filterConfig.key].max)}</span>
								</div>
								<div class="dual-range-slider">
									<input 
										type="range"
										bind:value={filters[filterConfig.key].min}
										min={dataRanges[filterConfig.key].min}
										max={dataRanges[filterConfig.key].max}
										step={filterConfig.step || 1}
										class="range-slider range-slider-min"
										disabled={!filters[filterConfig.key].enabled}
									/>
									<input 
										type="range"
										bind:value={filters[filterConfig.key].max}
										min={dataRanges[filterConfig.key].min}
										max={dataRanges[filterConfig.key].max}
										step={filterConfig.step || 1}
										class="range-slider range-slider-max"
										disabled={!filters[filterConfig.key].enabled}
									/>
								</div>
							</div>
						</div>
					</div>
					{/if}
				{/each}

				<!-- Date Range Filters -->
				{#each dateFields as filterConfig}
					{#if dataRanges[filterConfig.key] && dataRanges[filterConfig.key].count > 0}
					<div class="filter-section">
						<div class="filter-header-row">
							<div class="filter-enable">
								<Switch 
									bind:on={filters[filterConfig.key].enabled} 
									switchSize={20} 
									onColor="#0066cc"
								/>
								<span class="filter-label">{filterConfig.label}</span>
							</div>
							<div class="range-info">
								{dataRanges[filterConfig.key].min ? dataRanges[filterConfig.key].min.toLocaleDateString() : ''} - 
								{dataRanges[filterConfig.key].max ? dataRanges[filterConfig.key].max.toLocaleDateString() : ''}
							</div>
						</div>
						<div class="date-controls" class:disabled={!filters[filterConfig.key].enabled}>
							<div class="date-input-group">
								<label>Start:</label>
								<input 
									type="date" 
									bind:value={filters[filterConfig.key].start}
									disabled={!filters[filterConfig.key].enabled}
									min={dataRanges[filterConfig.key].min ? dataRanges[filterConfig.key].min.toISOString().split('T')[0] : ''}
									max={dataRanges[filterConfig.key].max ? dataRanges[filterConfig.key].max.toISOString().split('T')[0] : ''}
								/>
							</div>
							<div class="date-input-group">
								<label>End:</label>
								<input 
									type="date" 
									bind:value={filters[filterConfig.key].end}
									disabled={!filters[filterConfig.key].enabled}
									min={dataRanges[filterConfig.key].min ? dataRanges[filterConfig.key].min.toISOString().split('T')[0] : ''}
									max={dataRanges[filterConfig.key].max ? dataRanges[filterConfig.key].max.toISOString().split('T')[0] : ''}
								/>
							</div>
						</div>
					</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.filter-panel {
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		background: white;
		margin-bottom: 15px;
	}
	
	.toggle-button {
		width: 100%;
		padding: 8px 12px;
		background: #f8f9fa;
		border: none;
		border-bottom: 1px solid #e0e0e0;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 500;
		color: #495057;
		transition: background-color 0.2s;
	}
	
	.toggle-button:hover {
		background: #e9ecef;
	}
	
	.toggle-icon {
		font-size: 10px;
		transition: transform 0.2s;
	}

	.filter-count {
		color: #0066cc;
		font-weight: 600;
	}
	
	.filter-content {
		padding: 15px;
		background: white;
		max-height: 600px;
		overflow-y: auto;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20px;
		gap: 10px;
	}

	.clear-button, .apply-button {
		padding: 8px 16px;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
	}

	.clear-button {
		background: #f8f9fa;
		color: #6c757d;
	}

	.clear-button:hover:not(:disabled) {
		background: #e9ecef;
	}

	.clear-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.apply-button {
		background: #0066cc;
		color: white;
		border-color: #0066cc;
	}

	.apply-button:hover {
		background: #0052a3;
		border-color: #0052a3;
	}
	
	.filter-grid {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.debug-info {
		padding: 12px;
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		font-size: 12px;
	}

	.field-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 8px;
	}

	.field-tag {
		display: inline-block;
		padding: 2px 6px;
		background: #e9ecef;
		border-radius: 3px;
		font-size: 10px;
		font-family: monospace;
	}
	
	.filter-section {
		padding: 15px;
		border: 1px solid #f0f0f0;
		border-radius: 6px;
		background: #fafafa;
	}

	.filter-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.filter-enable {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.filter-label {
		font-weight: 600;
		color: #495057;
		font-size: 13px;
	}

	.range-info {
		font-size: 10px;
		color: #6c757d;
		font-weight: 500;
	}

	.range-controls, .date-controls {
		opacity: 1;
		transition: opacity 0.2s;
	}

	.range-controls.disabled, .date-controls.disabled {
		opacity: 0.5;
	}

	.manual-range {
		margin-bottom: 12px;
	}

	.range-inputs {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}

	.range-input-group {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.range-input-group label {
		font-size: 11px;
		color: #6c757d;
		font-weight: 500;
		min-width: 30px;
	}

	.range-input {
		width: 80px;
		padding: 4px 6px;
		border: 1px solid #ced4da;
		border-radius: 3px;
		font-size: 11px;
	}

	.apply-range-btn, .reset-range-btn {
		padding: 4px 8px;
		border: 1px solid #ced4da;
		border-radius: 3px;
		font-size: 10px;
		cursor: pointer;
		background: white;
		transition: all 0.2s;
	}

	.apply-range-btn:hover:not(:disabled) {
		background: #e9ecef;
	}

	.reset-range-btn:hover:not(:disabled) {
		background: #f8f9fa;
	}

	.apply-range-btn:disabled, .reset-range-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.slider-container {
		margin-top: 8px;
	}

	.slider-values {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
		font-size: 11px;
		font-weight: 500;
		color: #495057;
	}

	.dual-range-slider {
		position: relative;
		height: 24px;
	}

	.range-slider {
		position: absolute;
		width: 100%;
		height: 4px;
		background: transparent;
		outline: none;
		-webkit-appearance: none;
		pointer-events: none;
	}

	.range-slider::-webkit-slider-track {
		height: 4px;
		background: #ddd;
		border-radius: 2px;
	}

	.range-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		height: 16px;
		width: 16px;
		background: #0066cc;
		border-radius: 50%;
		cursor: pointer;
		pointer-events: all;
		position: relative;
		z-index: 1;
	}

	.range-slider::-moz-range-track {
		height: 4px;
		background: #ddd;
		border-radius: 2px;
		border: none;
	}

	.range-slider::-moz-range-thumb {
		height: 16px;
		width: 16px;
		background: #0066cc;
		border-radius: 50%;
		cursor: pointer;
		border: none;
		pointer-events: all;
	}

	.range-slider-max {
		z-index: 2;
	}

	.date-controls {
		display: flex;
		gap: 15px;
		align-items: center;
	}

	.date-input-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.date-input-group label {
		font-size: 11px;
		color: #6c757d;
		font-weight: 500;
		min-width: 35px;
	}

	.date-input-group input[type="date"] {
		padding: 4px 6px;
		border: 1px solid #ced4da;
		border-radius: 3px;
		font-size: 11px;
	}

	/* Scrollbar styling */
	.filter-content::-webkit-scrollbar {
		width: 6px;
	}
	
	.filter-content::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.filter-content::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}
</style>