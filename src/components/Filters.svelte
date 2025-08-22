<script>
	import { createEventDispatcher } from "svelte";
	import Label from "./sidebarComponents/Label.svelte";
	import BigLabel from "./sidebarComponents/BigLabel.svelte";
	import Slider from "./sidebarComponents/Slider.svelte";
	import Switch from "./sidebarComponents/Switch.svelte";

	const dispatch = createEventDispatcher();

	export let dataset = []; // All available data
	export let expanded = false;

	// Filter state
	let filters = {
		dateRange: {
			enabled: false,
			start: null,
			end: null
		},
		likes: {
			enabled: false,
			min: 0,
			max: 10000
		},
		comments: {
			enabled: false,
			min: 0,
			max: 1000
		},
		views: {
			enabled: false,
			min: 0,
			max: 100000
		},
		totalInteractions: {
			enabled: false,
			min: 0,
			max: 50000
		},
		followers: {
			enabled: false,
			min: 0,
			max: 1000000
		},
		performanceScore: {
			enabled: false,
			min: 0,
			max: 10
		}
	};

	// Data ranges (computed from dataset)
	let dataRanges = {};
	let dateRange = { min: null, max: null };

	// Update data ranges when dataset changes
	$: if (dataset && dataset.length > 0) {
		console.log("Dataset received:", dataset.length, "items");
		console.log("Sample item:", dataset[0]);
		updateDataRanges();
	}

	function updateDataRanges() {
		console.log("Updating data ranges...");
		const numericFields = [
			{ key: 'Likes', filter: 'likes' },
			{ key: 'Comments', filter: 'comments' },
			{ key: 'Views', filter: 'views' },
			{ key: 'Total Interactions', filter: 'totalInteractions' },
			{ key: 'Followers at Posting', filter: 'followers' },
			{ key: 'Overperforming Score (weighted  —  Likes 1x Comments 1x )', filter: 'performanceScore' }
		];

		// Calculate ranges for numeric fields
		numericFields.forEach(field => {
			console.log(`Processing field: ${field.key}`);
			const values = dataset
				.map(item => {
					// Check if the value exists and log it
					const value = item[field.key];
					if (value !== null && value !== undefined && !isNaN(value)) {
						return Number(value);
					}
					return null;
				})
				.filter(val => val !== null);
			
			console.log(`${field.key} values:`, values.slice(0, 5), `(${values.length} total)`);
			
			if (values.length > 0) {
				const min = Math.min(...values);
				const max = Math.max(...values);
				dataRanges[field.filter] = { min, max };
				console.log(`${field.key} range: ${min} - ${max}`);
				
				// Update filter defaults
				filters[field.filter].min = min;
				filters[field.filter].max = max;
			} else {
				console.log(`No valid values found for ${field.key}`);
			}
		});

		// Calculate date range
		console.log("Processing dates...");
		const dates = dataset
			.map(item => {
				const dateValue = item['Post Created'];
				console.log("Date value:", dateValue);
				return dateValue;
			})
			.filter(date => date)
			.map(date => new Date(date))
			.filter(date => !isNaN(date.getTime()));

		console.log("Valid dates:", dates.length);

		if (dates.length > 0) {
			dateRange.min = new Date(Math.min(...dates));
			dateRange.max = new Date(Math.max(...dates));
			
			console.log("Date range:", dateRange.min, "to", dateRange.max);
			
			// Set default date filter range
			filters.dateRange.start = dateRange.min.toISOString().split('T')[0];
			filters.dateRange.end = dateRange.max.toISOString().split('T')[0];
		}

		console.log("Final dataRanges:", dataRanges);
		console.log("Final filters:", filters);

		// Trigger reactive update
		filters = { ...filters };
	}

	function applyFilters() {
		let filteredData = [...dataset];

		// Date filter
		if (filters.dateRange.enabled && filters.dateRange.start && filters.dateRange.end) {
			const startDate = new Date(filters.dateRange.start);
			const endDate = new Date(filters.dateRange.end);
			endDate.setHours(23, 59, 59, 999); // Include entire end date

			filteredData = filteredData.filter(item => {
				const itemDate = new Date(item['Post Created']);
				return itemDate >= startDate && itemDate <= endDate;
			});
		}

		// Numeric filters
		const numericFilters = [
			{ filter: 'likes', key: 'Likes' },
			{ filter: 'comments', key: 'Comments' },
			{ filter: 'views', key: 'Views' },
			{ filter: 'totalInteractions', key: 'Total Interactions' },
			{ filter: 'followers', key: 'Followers at Posting' },
			{ filter: 'performanceScore', key: 'Overperforming Score (weighted  —  Likes 1x Comments 1x )' }
		];

		numericFilters.forEach(({ filter, key }) => {
			if (filters[filter].enabled) {
				filteredData = filteredData.filter(item => {
					const value = Number(item[key]);
					if (isNaN(value)) return false;
					return value >= filters[filter].min && value <= filters[filter].max;
				});
			}
		});

		// Dispatch filtered data
		dispatch('filtersChanged', {
			filteredData,
			activeFilters: getActiveFilters()
		});
	}

	function getActiveFilters() {
		const active = [];
		
		if (filters.dateRange.enabled) {
			active.push(`Date: ${filters.dateRange.start} to ${filters.dateRange.end}`);
		}
		
		Object.entries(filters).forEach(([key, filter]) => {
			if (key !== 'dateRange' && filter.enabled) {
				const label = getFilterLabel(key);
				active.push(`${label}: ${formatNumber(filter.min)} - ${formatNumber(filter.max)}`);
			}
		});
		
		return active;
	}

	function getFilterLabel(filterKey) {
		const labels = {
			likes: 'Likes',
			comments: 'Comments', 
			views: 'Views',
			totalInteractions: 'Total Interactions',
			followers: 'Followers',
			performanceScore: 'Performance Score'
		};
		return labels[filterKey] || filterKey;
	}

	function formatNumber(num) {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
		return num.toString();
	}

	function clearAllFilters() {
		Object.keys(filters).forEach(key => {
			filters[key].enabled = false;
		});
		filters = { ...filters };
		applyFilters();
	}

	function hasActiveFilters() {
		return Object.values(filters).some(filter => filter.enabled);
	}

	// Apply filters when any filter changes
	$: {
		// Watch for changes in filters and apply them
		if (dataset.length > 0) {
			applyFilters();
		}
	}
</script>

<div class="filters-panel">
	<button 
		class="toggle-button" 
		on:click={() => expanded = !expanded}
	>
		<span class="toggle-icon" class:expanded>{expanded ? '▼' : '▶'}</span>
		Data Filters
		{#if hasActiveFilters()}
			<span class="active-indicator">({getActiveFilters().length} active)</span>
		{/if}
	</button>
	
	{#if expanded}
		<div class="filters-content">
			<div class="filters-header">
				<button class="clear-button" on:click={clearAllFilters} disabled={!hasActiveFilters()}>
					Clear All Filters
				</button>
			</div>

			<!-- Date Range Filter -->
			{#if dateRange.min && dateRange.max}
				<div class="filter-section">
					<Label label="Date Range" outerDivStyle="margin-bottom: 8px;">
						<div class="filter-controls">
							<Switch 
								bind:on={filters.dateRange.enabled}
								switchSize={20}
								onColor={"hsl(0, 0%, 12%)"}
							/>
							<div class="date-inputs" class:disabled={!filters.dateRange.enabled}>
								<input 
									type="date" 
									bind:value={filters.dateRange.start}
									min={dateRange.min.toISOString().split('T')[0]}
									max={dateRange.max.toISOString().split('T')[0]}
									disabled={!filters.dateRange.enabled}
								/>
								<span>to</span>
								<input 
									type="date" 
									bind:value={filters.dateRange.end}
									min={dateRange.min.toISOString().split('T')[0]}
									max={dateRange.max.toISOString().split('T')[0]}
									disabled={!filters.dateRange.enabled}
								/>
							</div>
						</div>
					</Label>
				</div>
			{/if}

			<!-- Numeric Filters -->
			{#if dataRanges.likes}
				<div class="filter-section">
					<Label label="Likes" outerDivStyle="margin-bottom: 8px;">
						<div class="filter-controls">
							<Switch 
								bind:on={filters.likes.enabled}
								switchSize={20}
								onColor={"hsl(0, 0%, 12%)"}
							/>
							<div class="range-controls" class:disabled={!filters.likes.enabled}>
								<Slider
									width={120}
									height={30}
									bind:value={filters.likes.min}
									min={dataRanges.likes.min}
									max={filters.likes.max}
									step={Math.max(1, Math.floor((dataRanges.likes.max - dataRanges.likes.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.likes.enabled}
								/>
								<span class="range-divider">to</span>
								<Slider
									width={120}
									height={30}
									bind:value={filters.likes.max}
									min={filters.likes.min}
									max={dataRanges.likes.max}
									step={Math.max(1, Math.floor((dataRanges.likes.max - dataRanges.likes.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.likes.enabled}
								/>
							</div>
						</div>
					</Label>
				</div>
			{/if}

			{#if dataRanges.comments}
				<div class="filter-section">
					<Label label="Comments" outerDivStyle="margin-bottom: 8px;">
						<div class="filter-controls">
							<Switch 
								bind:on={filters.comments.enabled}
								switchSize={20}
								onColor={"hsl(0, 0%, 12%)"}
							/>
							<div class="range-controls" class:disabled={!filters.comments.enabled}>
								<Slider
									width={120}
									height={30}
									bind:value={filters.comments.min}
									min={dataRanges.comments.min}
									max={filters.comments.max}
									step={Math.max(1, Math.floor((dataRanges.comments.max - dataRanges.comments.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.comments.enabled}
								/>
								<span class="range-divider">to</span>
								<Slider
									width={120}
									height={30}
									bind:value={filters.comments.max}
									min={filters.comments.min}
									max={dataRanges.comments.max}
									step={Math.max(1, Math.floor((dataRanges.comments.max - dataRanges.comments.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.comments.enabled}
								/>
							</div>
						</div>
					</Label>
				</div>
			{/if}

			{#if dataRanges.views}
				<div class="filter-section">
					<Label label="Views" outerDivStyle="margin-bottom: 8px;">
						<div class="filter-controls">
							<Switch 
								bind:on={filters.views.enabled}
								switchSize={20}
								onColor={"hsl(0, 0%, 12%)"}
							/>
							<div class="range-controls" class:disabled={!filters.views.enabled}>
								<Slider
									width={120}
									height={30}
									bind:value={filters.views.min}
									min={dataRanges.views.min}
									max={filters.views.max}
									step={Math.max(1, Math.floor((dataRanges.views.max - dataRanges.views.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.views.enabled}
								/>
								<span class="range-divider">to</span>
								<Slider
									width={120}
									height={30}
									bind:value={filters.views.max}
									min={filters.views.min}
									max={dataRanges.views.max}
									step={Math.max(1, Math.floor((dataRanges.views.max - dataRanges.views.min) / 100))}
									valueFormatCallback={formatNumber}
									disabled={!filters.views.enabled}
								/>
							</div>
						</div>
					</Label>
				</div>
			{/if}

			{#if dataRanges.performanceScore}
				<div class="filter-section">
					<Label label="Performance Score" outerDivStyle="margin-bottom: 8px;">
						<div class="filter-controls">
							<Switch 
								bind:on={filters.performanceScore.enabled}
								switchSize={20}
								onColor={"hsl(0, 0%, 12%)"}
							/>
							<div class="range-controls" class:disabled={!filters.performanceScore.enabled}>
								<Slider
									width={120}
									height={30}
									bind:value={filters.performanceScore.min}
									min={dataRanges.performanceScore.min}
									max={filters.performanceScore.max}
									step={0.1}
									valueFormatCallback={(v) => v.toFixed(1)}
									disabled={!filters.performanceScore.enabled}
								/>
								<span class="range-divider">to</span>
								<Slider
									width={120}
									height={30}
									bind:value={filters.performanceScore.max}
									min={filters.performanceScore.min}
									max={dataRanges.performanceScore.max}
									step={0.1}
									valueFormatCallback={(v) => v.toFixed(1)}
									disabled={!filters.performanceScore.enabled}
								/>
							</div>
						</div>
					</Label>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.filters-panel {
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		background: white;
		margin-bottom: 15px;
	}
	
	.toggle-button {
		width: 100%;
		padding: 10px 12px;
		background: #f8f9fa;
		border: none;
		border-bottom: 1px solid #e0e0e0;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
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

	.active-indicator {
		color: #0066cc;
		font-size: 12px;
		margin-left: auto;
	}
	
	.filters-content {
		padding: 15px;
		background: white;
		max-height: 400px;
		overflow-y: auto;
	}

	.filters-header {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 15px;
	}

	.clear-button {
		padding: 6px 12px;
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 12px;
		transition: background-color 0.2s;
	}

	.clear-button:hover:not(:disabled) {
		background: #c82333;
	}

	.clear-button:disabled {
		background: #6c757d;
		cursor: not-allowed;
	}

	.filter-section {
		margin-bottom: 15px;
		padding-bottom: 12px;
		border-bottom: 1px solid #f0f0f0;
	}

	.filter-controls {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.date-inputs {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.date-inputs input[type="date"] {
		padding: 4px 8px;
		border: 1px solid #ccc;
		border-radius: 3px;
		font-size: 12px;
	}

	.date-inputs span {
		font-size: 12px;
		color: #666;
	}

	.range-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.range-divider {
		font-size: 12px;
		color: #666;
		margin: 0 4px;
	}

	.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	/* Scrollbar styling */
	.filters-content::-webkit-scrollbar {
		width: 6px;
	}
	
	.filters-content::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.filters-content::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}
</style>