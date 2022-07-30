// variable for holding db connection
let db;

// establish connection to IndexedDB database called budget_tracker v1
const request = indexedDB.open("budget_tracker", 1);

// event to emit if database version changes
request.onupgradeneeded = function (event) {
  // save a reference to db
  const db = event.target.result;

  // create an object store called new_transaction
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

// upon a successful object store creation
request.onsuccess = function (event) {
  // when a db is created or a connection is established, save db reference
  db = event.target.result;

  // if online, run upload to send local db data to api
  if (navigator.onLine) {
    uploadTransactions();
  }
};

request.onerror = function (event) {
  // log error
  console.log(event.target.errorCode);
};

// to be executed if we attempt to submit a transaction with no internet
function saveRecord(record) {
  // open a new transaction with readwrite permissions
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access 'new_transaction' object store
  const transObjectStore = transaction.objectStore("new_transaction");

  // add record to store with add method
  transObjectStore.add(record);
}

function uploadTransactions() {
  // open a transaction on your db
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access object store
  const transObjectStore = transaction.objectStore("new_transaction");

  // get all records from store
  const getAll = transObjectStore.getAll();

  // upon successful getAll(), run this function
  getAll.onsuccess = function () {
    // if there's data in store, send to server
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          // open one more transaction
          const transaction = db.transaction(["new_transaction"], "readwrite");

          // access the new_transaction object store
          const transObjectStore = transaction.objectStore("new_transaction");

          // clear all items from store
          transObjectStore.clear();

          alert("All saved transactions have been submitted!");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", uploadTransactions);
