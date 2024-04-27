let db;

function start() {
    const request = indexedDB.open("MyTestDatabase", 2);

    request.onerror = (event) => {
        console.error("Why didn't you allow my web app to use IndexedDB?!");
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("DB Created");
        writeData();
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cards')) {
            const objectStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex("id", "id", { unique: true });
        }
    };
}

function writeData() {
    const transaction = db.transaction(["cards"], "readwrite");

    // Do something when all the data is added to the database.
    transaction.oncomplete = (event) => {
        console.log("Data written!");
        readData();
    };
  
    transaction.onerror = (event) => {
        // Don't forget to handle errors!
    };
    
    const objectStore = transaction.objectStore("cards");
    const request = objectStore.add({name: "FOO"});
    request.onsuccess = (event) => {
      // event.target.result === customer.ssn;
    };
}

function readData() {
    const transaction = db.transaction(["cards"]);
    const objectStore = transaction.objectStore("cards");
    objectStore.getAll().onsuccess = (event) => {
        console.log("Got all cards:");
        console.log(event.target.result);
    };

    const objectStore2 = db.transaction("cards").objectStore("cards");

    objectStore2.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            console.log(`Name for ID ${cursor.key} is ${cursor.value.name}`);
            cursor.continue();
        } else {
            console.log("No more entries!");
        }
    };
}

start();


