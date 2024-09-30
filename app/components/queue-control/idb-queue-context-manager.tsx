// import { useEffect } from 'react';
// import { openDB } from 'idb';
// import { useQueueContext } from './queue-context'; // Assume this is your context

// // IndexedDB setup and utility functions
// const dbPromise = openDB('music-app', 1, {
//   upgrade(db) {
//     db.createObjectStore('queue');
//   },
// });

// const saveQueueToIndexedDB = async (queue) => {
//   const db = await dbPromise;
//   await db.put('queue', queue, 'currentQueue');
// };

// const loadQueueFromIndexedDB = async () => {
//   const db = await dbPromise;
//   return (await db.get('queue', 'currentQueue')) || [];
// };

// // IDBManager Component
// const IDBManager = () => {
//   const { queue, setQueueState } = useQueueContext();

//   // Load the queue from IndexedDB on mount
//   useEffect(() => {
//     const initializeQueue = async () => {
//       const storedQueue = await loadQueueFromIndexedDB();
//       setQueueState(storedQueue);
//     };
//     initializeQueue();
//   }, [setQueueState]);

//   // Save the queue to IndexedDB whenever it changes
//   useEffect(() => {
//     if (queue.length > 0) {
//       const saveQueue = async () => {
//         await saveQueueToIndexedDB(queue);
//       };
//       saveQueue();
//     }
//   }, [queue]);

//   return null; // This component doesn't render anything
// };

// export default IDBManager;
