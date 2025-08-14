(function() {
    "use strict";

    // --- Helper Functions ---
    function getUtcTimestamp() {
        return new Date().toISOString();
    }

    function formatUtcToLocalTime(utcTimestamp) {
        const date = new Date(utcTimestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    function getLocalUtcOffset() {
        const now = new Date();
        const offsetMinutes = now.getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        if (offsetHours === 0) return "UTC+0";
        return `UTC${offsetHours > 0 ? '+' : ''}${offsetHours}`;
    }

    // --- Simulated OPC UA Server Class ---
    class SimulatedOpcUaServer {
        constructor() {
            this.addressSpace = {
                'ns=0;i=84': {
                    browseName: 'Objects',
                    nodeId: 'ns=0;i=84',
                    nodeClass: 'Object',
                    children: {
                        'ns=1;s=Folder1': {
                            browseName: 'MyDevices',
                            nodeId: 'ns=1;s=Folder1',
                            nodeClass: 'Object',
                            children: {
                                'ns=1;s=Temperature': {
                                    browseName: 'Temperature',
                                    nodeId: 'ns=1;s=Temperature',
                                    nodeClass: 'Variable',
                                    dataType: 'Float',
                                    value: 25.5,
                                    accessLevel: 'ReadWrite',
                                    timestamp: getUtcTimestamp()
                                },
                                'ns=1;s=Pressure': {
                                    browseName: 'Pressure',
                                    nodeId: 'ns=1;s=Pressure',
                                    nodeClass: 'Variable',
                                    dataType: 'Float',
                                    value: 101.2,
                                    accessLevel: 'ReadWrite',
                                    timestamp: getUtcTimestamp()
                                },
                                'ns=1;s=Status': {
                                    browseName: 'Status',
                                    nodeId: 'ns=1;s=Status',
                                    nodeClass: 'Variable',
                                    dataType: 'Boolean',
                                    value: true,
                                    accessLevel: 'ReadOnly',
                                    timestamp: getUtcTimestamp()
                                },
                                'ns=1;s=DeviceName': {
                                    browseName: 'DeviceName',
                                    nodeId: 'ns=1;s=DeviceName',
                                    nodeClass: 'Variable',
                                    dataType: 'String',
                                    value: 'SensorUnit-A',
                                    accessLevel: 'ReadOnly',
                                    timestamp: getUtcTimestamp()
                                }
                            }
                        }
                    }
                }
            };
            this.subscriptions = {};
            this.updateInterval = null;
        }

        findNode(nodeId, currentSpace = this.addressSpace) {
            if (currentSpace[nodeId]) {
                return currentSpace[nodeId];
            }
            for (const key in currentSpace) {
                if (currentSpace[key].children) {
                    const found = this.findNode(nodeId, currentSpace[key].children);
                    if (found) return found;
                }
            }
            return null;
        }

        readNode(nodeId) {
            const node = this.findNode(nodeId);
            if (node && node.nodeClass === 'Variable') {
                return { value: node.value, dataType: node.dataType, accessLevel: node.accessLevel, timestamp: node.timestamp };
            }
            return null;
        }

        writeNode(nodeId, newValue) {
            const node = this.findNode(nodeId);
            if (!node || node.nodeClass !== 'Variable') {
                return { success: false, message: `Node '${nodeId}' not found or not a Variable.` };
            }
            if (node.accessLevel !== 'ReadWrite') {
                return { success: false, message: `Node '${node.browseName}' is ReadOnly.` };
            }

            let convertedValue;
            try {
                switch (node.dataType) {
                    case 'Float':
                        convertedValue = parseFloat(newValue);
                        if (isNaN(convertedValue)) throw new Error(`Invalid float value.`);
                        break;
                    case 'Boolean':
                        convertedValue = (newValue.toLowerCase() === 'true' || newValue === '1');
                        break;
                    case 'String':
                        convertedValue = String(newValue);
                        break;
                    default:
                        convertedValue = newValue;
                }
            } catch (e) {
                return { success: false, message: `${e.message} for ${node.dataType} type.` };
            }
            
            node.value = convertedValue;
            node.timestamp = getUtcTimestamp();
            if (this.subscriptions[nodeId]) {
                this.subscriptions[nodeId](node.value, node.timestamp);
            }
            return { success: true, message: `Value of ${node.browseName} updated to ${node.value}`, timestamp: node.timestamp, dataType: node.dataType };
        }

        browseNodes(parentNodeId = 'ns=0;i=84') {
            const parentNode = this.findNode(parentNodeId);
            if (parentNode && parentNode.children) {
                return Object.values(parentNode.children).map(node => ({
                    nodeId: node.nodeId,
                    browseName: node.browseName,
                    nodeClass: node.nodeClass,
                    dataType: node.dataType,
                    hasChildren: Object.keys(node.children || {}).length > 0,
                    value: node.value,
                    timestamp: node.timestamp
                }));
            }
            return [];
        }

        subscribe(nodeId, callback) {
            const node = this.findNode(nodeId);
            if (node && node.nodeClass === 'Variable') {
                this.subscriptions[nodeId] = callback;
                return { success: true, message: `Subscribed to '${node.browseName}'.` };
            }
            return { success: false, message: `Cannot subscribe to '${nodeId}'. Not a Variable.` };
        }

        unsubscribe(nodeId) {
            if (this.subscriptions[nodeId]) {
                delete this.subscriptions[nodeId];
                return { success: true, message: `Unsubscribed from '${nodeId}'.` };
            }
            return { success: false, message: `No active subscription for '${nodeId}'.` };
        }

        startDataSimulation() {
            if (this.updateInterval) return;
            this.updateInterval = setInterval(() => {
                const tempNode = this.findNode('ns=1;s=Temperature');
                if (tempNode) {
                    tempNode.value = (Math.random() * 10 + 20).toFixed(2);
                    tempNode.timestamp = getUtcTimestamp();
                    if (this.subscriptions['ns=1;s=Temperature']) {
                        this.subscriptions['ns=1;s=Temperature'](tempNode.value, tempNode.timestamp);
                    }
                }

                const pressureNode = this.findNode('ns=1;s=Pressure');
                if (pressureNode) {
                    pressureNode.value = (Math.random() * 5 + 98).toFixed(2);
                    pressureNode.timestamp = getUtcTimestamp();
                    if (this.subscriptions['ns=1;s=Pressure']) {
                        this.subscriptions['ns=1;s=Pressure'](pressureNode.value, pressureNode.timestamp);
                    }
                }
                updateServerNodeDisplay();
                if (isConnected) renderAddressSpaceTree(addressSpaceTree, server.browseNodes());
            }, 2000);
        }

        stopDataSimulation() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
    }

    // --- Global Instances and DOM Caching ---
    const server = new SimulatedOpcUaServer();
    let isConnected = false;
    let subscribedNodeId = null;

    const clientConnectionStatus = document.getElementById('client-connection-status');
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const addressSpaceTree = document.getElementById('address-space-tree');
    const nodeIdInput = document.getElementById('node-id-input');
    const nodeValueInput = document.getElementById('node-value-input');
    const readBtn = document.getElementById('read-btn');
    const writeBtn = document.getElementById('write-btn');
    const subscribeBtn = document.getElementById('subscribe-btn');
    const clientMessageBox = document.getElementById('client-message-box');
    const serverNodesDisplay = document.getElementById('server-nodes-display');
    const currentLocalTimeDisplay = document.getElementById('current-local-time');
    const localUtcOffsetDisplay = document.getElementById('local-utc-offset');
    const subscriptionLogContainer = document.getElementById('subscription-log');
    const subscriptionEntries = document.getElementById('subscription-entries');
    const subscribedNodeIdDisplay = document.getElementById('subscribed-node-id');


    // --- UI Functions ---
    function displayClientMessage(message, type = 'info', timeout = 5000) {
        clientMessageBox.textContent = message;
        clientMessageBox.className = 'message-box';
        clientMessageBox.classList.remove('hidden');
        if (type === 'error') clientMessageBox.classList.add('error-message');
        else if (type === 'success') clientMessageBox.classList.add('success-message');
        else if (type === 'info') clientMessageBox.classList.add('bg-blue-100', 'text-blue-800', 'border-blue-300');
        
        if (timeout) {
            setTimeout(() => clientMessageBox.classList.add('hidden'), timeout);
        }
    }

    function updateClientButtons() {
        connectBtn.disabled = isConnected;
        disconnectBtn.disabled = !isConnected;
        readBtn.disabled = !isConnected;
        writeBtn.disabled = !isConnected;
        subscribeBtn.disabled = !isConnected;
        
        if (subscribedNodeId) {
            subscribeBtn.textContent = 'Unsubscribe';
            subscribeBtn.classList.remove('btn-secondary');
            subscribeBtn.classList.add('btn-red');
        } else {
            subscribeBtn.textContent = 'Subscribe (Simulated)';
            subscribeBtn.classList.add('btn-secondary');
            subscribeBtn.classList.remove('btn-red');
        }
    }
    
    function renderAddressSpaceTree(parentElement, nodes, level = 0) {
        // Clear children for dynamic updates
        if (level === 0) {
            parentElement.innerHTML = '';
        } else {
            const oldUl = parentElement.querySelector(`ul.level-${level}`);
            if (oldUl) oldUl.remove();
        }

        const ul = document.createElement('ul');
        ul.classList.add(`level-${level}`);
        if (level > 0) ul.style.display = 'none';

        nodes.forEach(node => {
            const li = document.createElement('li');
            const nodeNameSpan = document.createElement('span');
            nodeNameSpan.classList.add('node-name');
            nodeNameSpan.textContent = node.browseName;
            nodeNameSpan.dataset.nodeId = node.nodeId;

            nodeNameSpan.onclick = (event) => {
                event.stopPropagation();
                document.querySelectorAll('.browse-tree .node-name.selected').forEach(el => el.classList.remove('selected'));
                nodeNameSpan.classList.add('selected');
                nodeIdInput.value = node.nodeId;
                displayClientMessage(`Node ID '${node.nodeId}' selected.`, 'info');

                if (node.hasChildren) {
                    const childUl = li.querySelector(`ul.level-${level + 1}`);
                    if (childUl) {
                        const isHidden = childUl.style.display === 'none';
                        childUl.style.display = isHidden ? 'block' : 'none';
                        const toggleIcon = nodeNameSpan.querySelector('.toggle-icon');
                        if (toggleIcon) toggleIcon.classList.toggle('rotated', isHidden);
                    }
                }
            };

            if (node.hasChildren) {
                const toggleIcon = document.createElement('span');
                toggleIcon.classList.add('toggle-icon');
                toggleIcon.innerHTML = '&#9658;';
                nodeNameSpan.prepend(toggleIcon);
            }

            const nodeTypeSpan = document.createElement('span');
            nodeTypeSpan.classList.add('node-type');
            nodeTypeSpan.textContent = node.nodeClass;
            nodeNameSpan.appendChild(nodeTypeSpan);

            li.appendChild(nodeNameSpan);

            if (node.nodeClass === 'Variable') {
                const nodeValueTimestampDisplay = document.createElement('span');
                nodeValueTimestampDisplay.classList.add('node-value-display');
                const utcTime = new Date(node.timestamp).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
                nodeValueTimestampDisplay.textContent = ` (Value: ${node.value}, Type: ${node.dataType}, UTC: ${utcTime})`;
                li.appendChild(nodeValueTimestampDisplay);
            }

            if (node.hasChildren) {
                const children = server.browseNodes(node.nodeId);
                renderAddressSpaceTree(li, children, level + 1);
            }
            ul.appendChild(li);
        });
        parentElement.appendChild(ul);
    }

    function updateServerNodeDisplay() {
        serverNodesDisplay.innerHTML = '';
        const nodesToDisplay = ['ns=1;s=Temperature', 'ns=1;s=Pressure', 'ns=1;s=Status', 'ns=1;s=DeviceName'];
        nodesToDisplay.forEach(nodeId => {
            const node = server.findNode(nodeId);
            if (node) {
                const div = document.createElement('div');
                div.classList.add('node-item');
                div.innerHTML = `
                    <span class="node-id">${node.browseName}</span>
                    <span class="node-value">${node.value}</span>
                    <span class="node-timestamp">${new Date(node.timestamp).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })} UTC</span>
                `;
                serverNodesDisplay.appendChild(div);
            }
        });
    }

    function updateLocalTimeDisplay() {
        const now = new Date();
        currentLocalTimeDisplay.textContent = `Current Local Time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} ${now.toLocaleDateString()}`;
        localUtcOffsetDisplay.textContent = `Your Offset: ${getLocalUtcOffset()}`;
    }

    // --- Event Handlers ---
    function handleConnect() {
        if (isConnected) return;
        isConnected = true;
        clientConnectionStatus.textContent = 'Client Status: Connected';
        clientConnectionStatus.classList.remove('bg-red-100', 'text-red-800', 'border-red-300');
        clientConnectionStatus.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
        
        updateClientButtons();
        server.startDataSimulation();
        updateServerNodeDisplay();
        
        addressSpaceTree.innerHTML = '';
        const rootNodes = server.browseNodes();
        renderAddressSpaceTree(addressSpaceTree, rootNodes);

        displayClientMessage('Successfully connected to simulated OPC UA Server.', 'success');
    }

    function handleDisconnect() {
        if (!isConnected) return;
        isConnected = false;
        clientConnectionStatus.textContent = 'Client Status: Disconnected';
        clientConnectionStatus.classList.remove('bg-green-100', 'text-green-800', 'border-green-300');
        clientConnectionStatus.classList.add('bg-red-100', 'text-red-800', 'border-red-300');

        if (subscribedNodeId) {
            server.unsubscribe(subscribedNodeId);
            subscribedNodeId = null;
        }
        subscriptionLogContainer.style.display = 'none';
        subscriptionEntries.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">No active subscription data.</p>';
        
        updateClientButtons();
        server.stopDataSimulation();
        
        addressSpaceTree.innerHTML = '<p class="text-gray-500 text-center py-4">Connect to server to browse.</p>';
        displayClientMessage('Disconnected from simulated OPC UA Server.', 'info');
    }

    function handleRead() {
        const nodeId = nodeIdInput.value.trim();
        if (!nodeId) {
            displayClientMessage('Please enter a Node ID to read.', 'error');
            return;
        }
        const result = server.readNode(nodeId);
        if (result) {
            const utcTime = new Date(result.timestamp).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
            const localTime = formatUtcToLocalTime(result.timestamp);
            const offset = getLocalUtcOffset();
            displayClientMessage(`Read Node '${nodeId}': Value = ${result.value}, Data Type = ${result.dataType}, Access = ${result.accessLevel}, UTC Timestamp = ${utcTime} UTC, Local Timestamp = ${localTime} ${offset}`, 'success', 10000);
        } else {
            displayClientMessage(`Failed to read Node '${nodeId}'. Node not found or not a variable.`, 'error');
        }
    }

    function handleWrite() {
        const nodeId = nodeIdInput.value.trim();
        const newValue = nodeValueInput.value.trim();
        if (!nodeId || !newValue) {
            displayClientMessage('Please enter both a Node ID and a value to write.', 'error');
            return;
        }
        const result = server.writeNode(nodeId, newValue);
        if (result.success) {
            const utcTime = new Date(result.timestamp).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
            const localTime = formatUtcToLocalTime(result.timestamp);
            const offset = getLocalUtcOffset();
            displayClientMessage(`${result.message}, UTC Timestamp = ${utcTime} UTC, Local Timestamp = ${localTime} ${offset}`, 'success', 10000);
            nodeValueInput.value = '';
        } else {
            displayClientMessage(`Failed to write to Node '${nodeId}': ${result.message}`, 'error');
        }
    }

    function handleSubscribe() {
        const nodeId = nodeIdInput.value.trim();
        if (!nodeId) {
            displayClientMessage('Please enter a Node ID to subscribe.', 'error');
            return;
        }

        if (subscribedNodeId === nodeId) {
            const result = server.unsubscribe(nodeId);
            if (result.success) {
                subscribedNodeId = null;
                subscriptionLogContainer.style.display = 'none';
                subscriptionEntries.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">No active subscription data.</p>';
                displayClientMessage(result.message, 'info');
            } else {
                displayClientMessage(`Unsubscription failed: ${result.message}`, 'error');
            }
        } else {
            if (subscribedNodeId) {
                server.unsubscribe(subscribedNodeId);
                subscriptionEntries.innerHTML = '';
            }

            const result = server.subscribe(nodeId, (newValue, newTimestamp) => {
                const utcTime = new Date(newTimestamp).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
                const localTime = formatUtcToLocalTime(newTimestamp);
                const newEntry = document.createElement('div');
                newEntry.classList.add('subscription-entry');
                newEntry.textContent = `New Value: ${newValue} (UTC: ${utcTime} | Local: ${localTime})`;
                subscriptionEntries.prepend(newEntry);
                if (subscriptionEntries.children.length > 10) {
                    subscriptionEntries.removeChild(subscriptionEntries.lastElementChild);
                }
            });

            if (result.success) {
                subscribedNodeId = nodeId;
                subscriptionLogContainer.style.display = 'block';
                subscribedNodeIdDisplay.textContent = nodeId;
                displayClientMessage(result.message, 'success');
            } else {
                subscribedNodeId = null;
                displayClientMessage(`Subscription failed: ${result.message}`, 'error');
            }
        }
        updateClientButtons();
    }

    // --- Initialization ---
    function init() {
        connectBtn.addEventListener('click', handleConnect);
        disconnectBtn.addEventListener('click', handleDisconnect);
        readBtn.addEventListener('click', handleRead);
        writeBtn.addEventListener('click', handleWrite);
        subscribeBtn.addEventListener('click', handleSubscribe);

        updateServerNodeDisplay();
        server.startDataSimulation();
        updateLocalTimeDisplay();
        setInterval(updateLocalTimeDisplay, 1000);
    }

    window.onload = init;
})();