<script>
	import { hasActiveFilters, filteredInstances, allInstances, activeFilters } from "../stores/filterStore";
</script>

{#if $hasActiveFilters}
	<div class="filter-status-compact">
		<span class="status-icon">🔍</span>
		<span class="status-text">
			{$filteredInstances.length} / {$allInstances.length} items
		</span>
		<span class="active-filters">
			({$activeFilters.length} filter{$activeFilters.length !== 1 ? 's' : ''})
		</span>
	</div>
{/if}

<style>
	.filter-status-compact {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		background: #e8f4fd;
		border: 1px solid #b3d9ff;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 500;
		color: #1565c0;
	}

	.status-icon {
		font-size: 10px;
	}

	.status-text {
		font-weight: 600;
	}

	.active-filters {
		opacity: 0.8;
		font-weight: 400;
	}
</style>