<script>
	export let image;
	export let expanded = false;
	
	// Define which fields to show and their display names
	const metadataFields = [
		{ key: 'Post Created', label: 'Post Date', format: 'date' },
		{ key: 'Account', label: 'Account', format: 'text' },
		{ key: 'Likes', label: 'Likes', format: 'number' },
		{ key: 'Comments', label: 'Comments', format: 'number' },
		{ key: 'Views', label: 'Views', format: 'number' },
		{ key: 'Total Interactions', label: 'Total Interactions', format: 'number' },
		{ key: 'Followers at Posting', label: 'Followers', format: 'number' },
		{ key: 'Overperforming Score (weighted  —  Likes 1x Comments 1x )', label: 'Performance Score', format: 'decimal' },
		{ key: 'Description', label: 'Description', format: 'longtext' },
		{ key: 'Image Text', label: 'Image Text', format: 'longtext' },
		{ key: 'URL', label: 'Original URL', format: 'url' }
	];
	
	function formatValue(value, format) {
		if (value === null || value === undefined || value === '') return '—';
		
		switch (format) {
			case 'date':
				try {
					return new Date(value).toLocaleDateString();
				} catch {
					return value;
				}
			case 'number':
				return new Intl.NumberFormat().format(value);
			case 'decimal':
				return typeof value === 'number' ? value.toFixed(2) : value;
			case 'longtext':
				return value;
			case 'url':
				return value;
			default:
				return value;
		}
	}
	
	function hasValue(value) {
		return value !== null && value !== undefined && value !== '';
	}
	
	// Filter to only show fields that have values
	$: availableFields = metadataFields.filter(field => 
		image && hasValue(image[field.key])
	);
</script>

{#if image && availableFields.length > 0}
	<div class="metadata-panel">
		<button 
			class="toggle-button" 
			on:click={() => expanded = !expanded}
		>
			<span class="toggle-icon" class:expanded>{expanded ? '▼' : '▶'}</span>
			Metadata ({availableFields.length} fields)
		</button>
		
		{#if expanded}
			<div class="metadata-content">
				<div class="metadata-grid">
					{#each availableFields as field}
						<div class="metadata-row">
							<div class="metadata-label">{field.label}:</div>
							<div class="metadata-value">
								{#if field.format === 'url'}
									<a href={image[field.key]} target="_blank" class="url-link">
										View Original
									</a>
								{:else if field.format === 'longtext'}
									<div class="longtext" title={image[field.key]}>
										{formatValue(image[field.key], field.format)}
									</div>
								{:else}
									{formatValue(image[field.key], field.format)}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.metadata-panel {
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		background: white;
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
	
	.metadata-content {
		padding: 12px;
		background: white;
		max-height: 300px;
		overflow-y: auto;
	}
	
	.metadata-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	
	.metadata-row {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 12px;
		align-items: start;
		font-size: 12px;
	}
	
	.metadata-label {
		font-weight: 500;
		color: #6c757d;
		text-align: right;
	}
	
	.metadata-value {
		color: #212529;
		word-break: break-word;
	}
	
	.longtext {
		max-height: 60px;
		overflow-y: auto;
		line-height: 1.4;
		padding: 4px;
		background: #f8f9fa;
		border-radius: 2px;
		font-size: 11px;
	}
	
	.url-link {
		color: #0066cc;
		text-decoration: none;
		font-size: 11px;
	}
	
	.url-link:hover {
		text-decoration: underline;
	}
	
	/* Scrollbar styling */
	.metadata-content::-webkit-scrollbar,
	.longtext::-webkit-scrollbar {
		width: 4px;
	}
	
	.metadata-content::-webkit-scrollbar-track,
	.longtext::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.metadata-content::-webkit-scrollbar-thumb,
	.longtext::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 2px;
	}
</style>