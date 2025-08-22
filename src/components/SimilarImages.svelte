<script>
	import {
		showMisclassifications,
		hasPredictedClass,
		hasTrueClass,
		hasSimilar,
		imagesToHighlight,
		selectedImage,
	} from "../stores/sidebarStore";
	import { globalLeafNodesObject } from "../stores/globalDataStore";
	import { imagesEndpoint } from "../stores/endPoints";
	import Label from "./sidebarComponents/Label.svelte";
	import MetadataPanel from "./MetadataPanel.svelte";

	export let image;
	export let imageWidth = 50;
	export let imageHeight = 50;
	export let selectedImageHeight = 150;
	export let selectedImageWidth = 150;
	export let showSimilarImages = true;
	export let incorrectColor = "red";

	const labelWidth = 150;

	function imageIsEmpty() {
		return image === null || image === undefined;
	}
	function handleNull(value, _default = "...") {
		return !imageIsEmpty() ? value : _default;
	}

	// Helper function to safely get similar images array
	function getSimilarImages(img) {
		if (!img || !img.similar) return [];
		return Array.isArray(img.similar) ? img.similar : [];
	}

	// Helper function to safely get image data
	function getImageData(instanceId) {
		if (!$globalLeafNodesObject.idMap || !$globalLeafNodesObject.idMap.has(instanceId)) {
			return null;
		}
		return $globalLeafNodesObject.idMap.get(instanceId);
	}
</script>

<div id="overall-container">
	<div id="selected-image">
		<div id="big-image">
			<div class="image-desc">
				<div class="row">
					<Label
						label="Image ID"
						outerDivStyle="width: {labelWidth}px;"
					>
						{handleNull(image?.instance_index)}
					</Label>
					{#if $hasTrueClass}
						<Label
							label="True Class"
							outerDivStyle="width: {labelWidth}px; "
						>
							{handleNull(image?.true_class)}
						</Label>
					{/if}
				</div>
				{#if $hasPredictedClass}
					<div class="row" style="justify-content: end;">
						<Label
							label="Predicted Class"
							outerDivStyle="width: {labelWidth}px; margin-left: 15px;"
						>
							{handleNull(image?.predicted_class)}
						</Label>
					</div>
				{/if}
			</div>
			<div
				id="current-image-selection"
				style="width:{selectedImageWidth}px; height: {selectedImageHeight}px; border: 1px {!imageIsEmpty() &&
				$showMisclassifications &&
				!image?.correct
					? incorrectColor
					: 'lightgrey'} solid;"
			>
				{#if image && image.filename}
					<img
						src="{$imagesEndpoint}/{image.filename}"
						width={selectedImageWidth}
						height={selectedImageHeight}
						alt="magnified"
					/>
				{:else if image}
					<div class="no-image-placeholder">
						<span>Image not available</span>
						<br>
						<small>ID: {image.instance_index || 'Unknown'}</small>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Metadata Panel with proper spacing -->
	<div class="metadata-section">
		<MetadataPanel {image} />
	</div>

	{#if showSimilarImages && $hasSimilar}
		<div class="similar-images-section">
			<Label label="Similar Images" outerDivStyle="margin-bottom: 8px;">
				<div id="big-image-info">
					<div id="container">
						{#if image && getSimilarImages(image).length > 0}
							{#each getSimilarImages(image) as simInstanceId}
								{@const similarImageData = getImageData(simInstanceId)}
								{#if similarImageData && similarImageData.filename}
									<button
										class="similar-image-button"
										type="button"
										on:click={() => {
											// Set this similar image as the new selected image
											selectedImage.set(similarImageData);
										}}
										on:mouseenter={() => {
											// Only highlight in the treemap, don't change the main image display
											imagesToHighlight.set([simInstanceId]);
										}}
										on:mouseleave={() => {
											imagesToHighlight.set([]);
										}}
										aria-label="Select similar image {simInstanceId}"
									>
										<img
											src="{$imagesEndpoint}/{similarImageData.filename}"
											alt="similar image {simInstanceId}"
											width={imageWidth}
											height={imageHeight}
											style="border: 2px {$showMisclassifications &&
											!similarImageData.correct
												? incorrectColor
												: 'transparent'} solid;"
										/>
									</button>
								{:else}
									<!-- Fallback for missing image data -->
									<div class="missing-similar-image" title="Image data not available">
										<span>?</span>
									</div>
								{/if}
							{/each}
						{:else if image}
							<div class="no-similar-message">
								No similar images available
							</div>
						{/if}
					</div>
				</div>
			</Label>
		</div>
	{/if}
</div>

<style>
	#overall-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	#container {
		height: calc(100vh - 520px); /* Dynamic height based on viewport, accounting for other elements */
		min-height: 120px; /* Minimum height to ensure usability */
		max-height: 400px; /* Maximum height to prevent it from becoming too large */
		overflow-y: auto;
		display: flex;
		flex-flow: row;
		flex-wrap: wrap;
		justify-content: start;
		border: 1px lightgrey solid;
		align-content: flex-start; /* Align items to the top when wrapping */
	}
	#selected-image {
		display: flex;
		justify-content: center;
	}
	#big-image {
		display: flex;
		align-items: center;
	}

	/* Metadata section spacing */
	.metadata-section {
		margin-top: 15px;
		margin-bottom: 10px;
		padding: 0 5px;
		flex-shrink: 0; /* Don't shrink this section */
	}

	/* Similar images section that takes remaining space */
	.similar-images-section {
		flex: 1; /* Take remaining space */
		display: flex;
		flex-direction: column;
		min-height: 0; /* Allow flex child to shrink */
		margin-top: 15px;
	}

	/* Button styling for similar images */
	.similar-image-button {
		padding: 0;
		margin: 1px;
		border: none;
		background: none;
		cursor: pointer;
		display: inline-block;
	}

	.similar-image-button:focus {
		outline: 2px solid #0066cc;
		outline-offset: 2px;
	}

	.no-image-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #f8f9fa;
		color: #6c757d;
		border: 1px dashed #dee2e6;
		text-align: center;
		font-size: 12px;
	}

	.missing-similar-image {
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8f9fa;
		border: 1px dashed #dee2e6;
		color: #6c757d;
		font-size: 20px;
		margin: 1px;
	}

	.no-similar-message {
		width: 100%;
		padding: 20px;
		text-align: center;
		color: #6c757d;
		font-size: 12px;
		font-style: italic;
	}

	/* width */
	::-webkit-scrollbar {
		width: 5px;
	}

	/* Track */
	::-webkit-scrollbar-track {
		background: #f1f1f1;
	}

	/* Handle */
	::-webkit-scrollbar-thumb {
		background: #888;
	}

	/* Handle on hover */
	::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
	.row {
		display: flex;
		margin-left: 20px;
		margin-bottom: 20px;
		text-overflow: ellipsis;
	}
	#current-image-selection {
		border: 1px solid lightgrey;
	}
</style>