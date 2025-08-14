### OPCUA_Simulation
This is a basic web application that simulates a simplified OPC UA server and client. The application is structured with separate files for HTML, CSS, and JavaScript, following a modular design pattern for better maintainability and readability.

Features:

Simulated OPC UA Server: A JavaScript class SimulatedOpcUaServer mimics an OPC UA server with a predefined address space, including nodes for temperature, pressure, status, and device name.

Dynamic Data Simulation: The server automatically updates the values of certain nodes (e.g., temperature and pressure) at a set interval to simulate real-time data changes.

Client Connection Simulation: A client interface allows you to "connect" and "disconnect" from the server, changing the UI state and enabling client-side functionalities.

Address Space Browse: The client can browse the simulated address space in a hierarchical tree view. Clicking on a node in the tree automatically populates the Node ID field for further interaction.

Read/Write Operations: The client can perform simulated Read and Write operations on variable nodes. The Write function includes basic type conversion and error handling.

Simulated Subscriptions: The client can "subscribe" to a node. When a node's value changes, either from the server's simulation or a manual write operation, the subscribed client receives a real-time update that is logged in a dedicated area.

Time Synchronization: The application displays both the server's UTC timestamp and the client's local time and offset, demonstrating how OPC UA handles time data.

User-Friendly Interface: The application uses Tailwind CSS for styling, providing a clean and responsive design. It includes clear status messages for connection, read/write actions, and subscription events.

File Structure:

index.html: The main HTML file containing the document structure and links to the CSS and JavaScript files.

styles.css: The stylesheet for the application, handling all the visual presentation.

app.js: The core JavaScript file containing the application logic, including the SimulatedOpcUaServer class, UI-related functions, and all event handlers.
