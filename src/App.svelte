<script>
	import { givenInstanceIdGetLeafNodeMap as IdToLeafNodeMap, assignImageClusterToEachNode } from "./util";
	import { ScaleOut } from "svelte-loading-spinners";
	import { imagesEndpoint } from "./stores/endPoints";
	import {
		globalClasses,
		globalLeafNodesObject,
	} from "./stores/globalDataStore";
	import {
		treemapNumClusters,
		treemapImageSize,
		hasClasses,
		hasTrueClass,
		hasPredictedClass,
		hasSimilar,
		hasAccuracy,
		selectedImage,
		imagesToHighlight,
		highlightSimilarImages,
		highlightIncorrectImages,
		showMisclassifications,
		selectedParent,
	} from "./stores/sidebarStore";
	import { filteredInstances, allInstances, hasActiveFilters } from "./stores/filterStore";
	import * as links from "./links";
	import * as d3 from "d3";

	import Sidebar from "./components/Sidebar.svelte";
	import DendroMap from "./components/dendroMap/DendroMap.svelte";
	import GithubIcon from "./components/misc/GithubIcon.svelte";
	import PaperIcon from "./components/misc/PaperIcon.svelte";
	import ArticleSidebar from "./components/article/ArticleSidebar.svelte";

	// check (stores/globalDataStore.js for more info.)
	function storeDataGlobally({ classes, leafNodes, leafIdMap }) {
		globalLeafNodesObject.set({ idMap: leafIdMap, array: leafNodes });
		globalClasses.set(classes);
	}

	function processData(tree) {
		function getLeafNodes(node) {
			const leaves = [];
			function _getLeafNode(parent) {
				if (parent.leaf || parent.children === undefined) {
					leaves.push(parent);
					return;
				}
				parent.children.forEach((child) => _getLeafNode(child));
			}
			_getLeafNode(tree);
			return leaves;
		}
		const leafNodes = getLeafNodes(tree);
		const leafIdMap = IdToLeafNodeMap(leafNodes);

		return { leafIdMap, leafNodes };
	}

	async function formatAndStoreDendrogram(tree, classes) {
		// Store the original tree for DendroMap
		rootNode = tree;
		
		// Create the formatted version for our internal use
		formattedDendrogramData = formatDendrogram(tree, true);
		
		const { leafIdMap, leafNodes } = processData(tree);
		// change the visualization based on provided information
		const firstLeafNode = leafNodes[0];
		hasSimilar.set("similar" in firstLeafNode);
		hasPredictedClass.set("predicted_class" in firstLeafNode);
		hasTrueClass.set("true_class" in firstLeafNode);
		hasAccuracy.set("accuracy" in firstLeafNode);
		let hasClassesValue = classes !== undefined;
		hasClasses.set(hasClassesValue);
		if (hasClassesValue) {
			treeClasses = classes;
		}
		let output = {
			classes: treeClasses,
			leafNodes,
			leafIdMap,
		};

		storeDataGlobally(output);
		imagesEndpoint.set(selectedOption.image_filepath);
	}

	async function fetchData() {
		showTreemap = await false;
		if (dataCache === null) {
			const res = await fetch(selectedOption.cluster_filepath);
			const data = await res.json();
			dataCache = data;
		}
		console.log(selectedOption.image_filepath);
		await formatAndStoreDendrogram(
			dataCache.tree,
			dataCache.classes ?? undefined
		);
		showTreemap = await true;
	}

	async function fetchClassedData(selectedClass) {
		showTreemap = await false;
		classClusteringsPresent = false;
		if (!(selectedClass in classedDataCache)) {
			const res = await fetch(selectedOption.class_cluster_filepath);
			const data = await res.json();
			classedDataCache = {};
			data["classes"].forEach((class_name) => {
				const tree = data[class_name];
				classedDataCache[class_name] = {
					tree,
					classes: data["classes"],
				};
			});
		}
		const selectedData = classedDataCache[selectedClass];
		formatAndStoreDendrogram(selectedData.tree, selectedData.classes);
		classClusteringsPresent = true;
		showTreemap = await true;
	}

	function silenceConsoleLogs() {
		console.log("console log is silenced 😴");
		console.log = () => {};
	}

	/**
	 * Takes in an object with keys that are the URL param name and the value is a callback that contains the url value
	 * @param {paramName: (value) => void} requestedParamsObj
	 */
	function getURLParameters(requestedParamsObj) {
		const requestedEntries = Object.entries(requestedParamsObj);
		const urlParameters = new URLSearchParams(window.location.search);
		requestedEntries.forEach(([parameter, callback], i) => {
			if (urlParameters.has(parameter)) {
				const value = urlParameters.get(parameter);
				callback(value);
			} else {
				callback(undefined);
			}
		});
	}

	// Format dendrogram function with safety checks
	function formatDendrogram(unformattedRootNode, hasPredictions = false) {
		function forEachLeaf(parent, callback) {
			if (parent.leaf || !parent.children || parent.children.length === 0) {
				callback(parent);
				return;
			}
			parent.children.forEach((child) => {
				forEachLeaf(child, callback);
			});
		}
		
		// remove this by init value as 1 for leaves in python
		forEachLeaf(unformattedRootNode, (node) => {
			node.value = 1;
			if (hasPredictions && node.correct_count !== undefined) {
				node.correct = node.correct_count === 1;
			}
		});
		
		const hierarchicalData = d3
			.hierarchy(unformattedRootNode)
			.sum((d) => d.value || 1);
		
		console.log(hierarchicalData);
		assignImageClusterToEachNode(hierarchicalData); // creates a cluster property on each node in the tree
		return hierarchicalData;
	}

	// Create a filtered tree that maintains hierarchical structure
	function createFilteredTreeFromInstances(filteredInstances, originalTree) {
		console.log("Creating filtered tree from", filteredInstances.length, "instances");
		
		if (filteredInstances.length === 0) {
			// Return empty tree
			return {
				leaf: false,
				node_index: 999999,
				node_count: 0,
				value: 1,
				merging_distance: 0,
				children: []
			};
		}

		if (filteredInstances.length === 1) {
			// Single instance - create simple tree
			const instance = filteredInstances[0];
			return {
				leaf: false,
				node_index: 999998,
				node_count: 1,
				value: 1,
				merging_distance: 0,
				children: [{
					...instance,
					leaf: true,
					value: 1,
					node_count: 1,
					children: undefined
				}]
			};
		}

		// For multiple instances, create a simple binary tree structure
		// This ensures the layout algorithm can handle it properly
		function createSimpleTree(instances, nodeIndex = 999997) {
			if (instances.length === 1) {
				return {
					...instances[0],
					leaf: true,
					value: 1,
					node_count: 1,
					children: undefined
				};
			}

			if (instances.length === 2) {
				return {
					leaf: false,
					node_index: nodeIndex,
					node_count: 2,
					value: 1,
					merging_distance: 1,
					children: [
						{
							...instances[0],
							leaf: true,
							value: 1,
							node_count: 1,
							children: undefined
						},
						{
							...instances[1],
							leaf: true,
							value: 1,
							node_count: 1,
							children: undefined
						}
					]
				};
			}

			// Split instances in half and create subtrees
			const mid = Math.floor(instances.length / 2);
			const leftInstances = instances.slice(0, mid);
			const rightInstances = instances.slice(mid);

			return {
				leaf: false,
				node_index: nodeIndex,
				node_count: instances.length,
				value: 1,
				merging_distance: 1,
				children: [
					createSimpleTree(leftInstances, nodeIndex - 1000),
					createSimpleTree(rightInstances, nodeIndex - 2000)
				]
			};
		}

		const filteredTree = createSimpleTree(filteredInstances);
		console.log("Created simple filtered tree with", filteredInstances.length, "instances");
		return filteredTree;
	}

	// Handle filtered data changes - REBUILD THE TREE with hierarchical structure
	function handleDataFiltered(event) {
		const { filteredInstances: newFilteredInstances, activeFilters } = event.detail;
		
		console.log("Filter event received:", newFilteredInstances.length, "instances,", activeFilters.length, "active filters");
		
		if (activeFilters.length > 0 && newFilteredInstances.length > 0) {
			// Create a filtered tree that maintains hierarchical structure
			const filteredTree = createFilteredTreeFromInstances(newFilteredInstances, dataCache.tree);
			
			// Validate the filtered tree before using it
			if (filteredTree && typeof filteredTree === 'object' && filteredTree.value !== undefined) {
				rootNode = filteredTree;
				console.log("Using filtered tree with hierarchical structure:", filteredTree);
			} else {
				console.error("Invalid filtered tree created, falling back to original tree");
				rootNode = dataCache.tree;
			}
		} else {
			// Use original tree
			rootNode = dataCache.tree;
			console.log("Using original tree");
		}
		
		// Clear current selection when filters change
		selectedImage.set(null);
		selectedParent.set(rootNode);
		
		// Force a re-render by toggling showTreemap
		showTreemap = false;
		setTimeout(() => {
			showTreemap = true;
		}, 100); // Increased timeout to ensure proper cleanup
	}

	// props
	export let options; // settings you can change in main.js that shows up in the dropdown in the sidebar

	getURLParameters({
		mnist: (value) => {
			if (value !== undefined) {
			} else {
				options = options.filter(
					(option) => option.dataset.toLowerCase() !== "mnist"
				);
			}
		},
	});
	export let silenceConsole = false;
	if (silenceConsole) {
		silenceConsoleLogs();
	}

	// vars
	let selectedOptionIndex = 0;
	let selectedOption;
	$: {
		selectedOption = options[selectedOptionIndex];
		classedDataCache = {};
		dataCache = null;
	}

	let classedDataCache = {};
	let dataCache = null;
	let currentParentCluster = null;

	// indicators of when things are done or if we have a certain item
	let changedDataset = false;
	let articleOpen = false;
	let showTreemap = false;
	let classClusteringsPresent;

	// dendromap dimension size
	const screen = {
		width: document.body.clientWidth,
		height: document.body.clientHeight,
	};

	// app variables for data
	let dendrogramData;
	let treeClasses;
	let rootNode;
	let formattedDendrogramData;

	// on change of the dataset update the dataset
	$: {
		const updateSelection = async (index) => {
			changedDataset = await true;
			await fetchData(index);
			changedDataset = await false;
		};
		updateSelection(selectedOptionIndex);
	}
	$: {
		selectedParent.set(currentParentCluster);
	}

	// Watch for filtered data changes - Clear highlights since we're filtering the tree itself
	$: if ($hasActiveFilters && $filteredInstances.length !== $allInstances.length) {
		// Clear highlights since we're actually filtering the dataset
		imagesToHighlight.set([]);
	} else if (!$hasActiveFilters) {
		imagesToHighlight.set([]);
	}
</script>

<div id="top-bar">
	<div id="title"><code>DendroMap</code></div>
	<div id="links" style="gap: 15px; margin-top:6px;">
		<div title="Take me to the code." style="">
			<a href={links.github} target="_blank">
				<GithubIcon height={25} fill="white" />
			</a>
		</div>
		<div title="Take me to the research paper." style="">
			<a href={links.paper} target="_blank">
				<PaperIcon height={25} fill="white" />
			</a>
		</div>
	</div>
</div>

<div>
	<div id="main">
		<div id="sidebar">
			<Sidebar
				on:filterClass={async (e) => {
					const className = e.detail;
					showTreemap = await false;
					if (className === null) {
						await fetchData();
					} else {
						await fetchClassedData(className);
					}
					console.log(e.detail);
					showTreemap = await true;
				}}
				on:dataFiltered={handleDataFiltered}
				classes={treeClasses}
				{options}
				bind:selectedOption={selectedOptionIndex}
				bind:articleSidebarOpen={articleOpen}
				{changedDataset}
			/>
		</div>
		<div id="vis">
			{#if showTreemap}
				<DendroMap
					dendrogramData={rootNode}
					imageFilepath={selectedOption.image_filepath}
					imageWidth={$treemapImageSize}
					imageHeight={$treemapImageSize}
					width={Math.max(screen.width - 600, 600)}
					height={835}
					renderingMethod={"breadth"}
					numClustersShowing={$treemapNumClusters}
					imagesToFocus={$imagesToHighlight}
					outlineMisclassified={$showMisclassifications}
					focusMisclassified={$highlightIncorrectImages}
					clusterLabelCallback={(d) => {
						let totalLabel = `${d.data.node_count} image${
							d.data.node_count > 1 ? "s" : ""
						}`;
						if ($hasAccuracy) {
							totalLabel += `, ${(d.data.accuracy * 100).toFixed(
								2
							)}% accuracy`;
						}
						return totalLabel;
					}}
					imageTitleCallback={(d) => {
						let titleMsg = `Image ${d.instance_index}`;
						
						// Add class information
						if ($hasTrueClass) {
							titleMsg += `\nTrue class: ${d.true_class}`;
						}
						if ($hasPredictedClass) {
							titleMsg += `\nPredicted class: ${d.predicted_class}`;
						}
						
						// Add engagement metrics
						if (d.Likes !== undefined) {
							titleMsg += `\nLikes: ${new Intl.NumberFormat().format(d.Likes)}`;
						}
						if (d.Comments !== undefined) {
							titleMsg += `\nComments: ${new Intl.NumberFormat().format(d.Comments)}`;
						}
						if (d.Views !== undefined) {
							titleMsg += `\nViews: ${new Intl.NumberFormat().format(d.Views)}`;
						}
		
						// Add account information
						if (d.Account) {
							titleMsg += `\nAccount: ${d.Account}`;
						}
						
						// Add post date
						if (d['Post Created']) {
							try {
								const date = new Date(d['Post Created']).toLocaleDateString();
								titleMsg += `\nPosted: ${date}`;
							} catch {
								titleMsg += `\nPosted: ${d['Post Created']}`;
							}
						}
						
						// Add description preview
						if (d.Description) {
							const shortDesc = d.Description.length > 50 
								? d.Description.substring(0, 50) + "..." 
								: d.Description;
							titleMsg += `\nDescription: ${shortDesc}`;
						}
						
						titleMsg += `\n\nClick to select and view full details`;
						
						return titleMsg;
					}}
					bind:currentParentCluster
					on:imageClick={(e) => {
						const { data, el, event } = e.detail;
						selectedImage.set(data); // pass to the sidebar
					}}
					on:imageMouseEnter={(e) => {
						const { data, el, event } = e.detail;
						if ($highlightSimilarImages) {
							imagesToHighlight.set([
								data.instance_index,
								...data.similar,
							]);
						}
					}}
					on:imageMouseLeave={(e) => {
						const { data, el, event } = e.detail;
						if ($highlightSimilarImages) {
							imagesToHighlight.set([]);
						}
					}}
					on:clusterClick={(e) => {
						// const { data, el, event } = e.detail;
					}}
					on:clusterMouseEnter={({ detail }) => {
						// const { data, el, event } = e.detail;
					}}
					on:clusterMouseLeave={({ detail }) => {
						// const { data, el, event } = e.detail;
					}}
				/>
			{:else}
				<div style="display:flex; gap:10px; align-items:center;">
					<h1 style="margin:0;padding:0;color: #00000020;">
						Loading Data
					</h1>
					<ScaleOut size="40" color="#333333" unit="px" />
				</div>
			{/if}
		</div>
	</div>
	<ArticleSidebar bind:open={articleOpen} />
</div>

<style>
	#top-bar {
		width: 100%;
		height: 25px;
		background-color: var(--dark-grey);
		padding-top: 10px;
		padding-bottom: 10px;
		display: flex;
		align-items: center;
	}
	#title {
		color: white;
		font-size: 25px;
		font-weight: 600;
		margin-left: 20px;
		margin-top: -4px;
	}
	#main {
		display: flex;
		height: 850px;
		border-bottom: 1.5px solid #00000010;
	}
	#sidebar {
		--width: 550px;
		width: var(--width);
		max-width: var(--width);
		min-width: var(--width);
	}
	code {
		font-family: monospace;
	}
	#links {
		display: flex;
		color: white;
		position: absolute;
		right: 25px;
	}
	#vis {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>