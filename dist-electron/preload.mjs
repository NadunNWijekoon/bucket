let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	windowAction: (action) => electron.ipcRenderer.send("window-action", action),
	getDownloadPath: () => electron.ipcRenderer.invoke("get-download-path"),
	openFolder: (path) => electron.ipcRenderer.invoke("open-folder", path),
	startDownload: (data) => electron.ipcRenderer.send("start-download", data),
	cancelDownload: (id) => electron.ipcRenderer.send("cancel-download", id),
	onDownloadProgress: (id, callback) => {
		const subscription = (_event, data) => callback(data);
		electron.ipcRenderer.on(`download-progress-${id}`, subscription);
		return () => electron.ipcRenderer.removeListener(`download-progress-${id}`, subscription);
	},
	onDownloadMetadata: (id, callback) => {
		const subscription = (_event, data) => callback(data);
		electron.ipcRenderer.on(`download-metadata-${id}`, subscription);
		return () => electron.ipcRenderer.removeListener(`download-metadata-${id}`, subscription);
	},
	onDownloadCompleted: (id, callback) => {
		const subscription = (_event, data) => callback(data);
		electron.ipcRenderer.on(`download-completed-${id}`, subscription);
		return () => electron.ipcRenderer.removeListener(`download-completed-${id}`, subscription);
	},
	onDownloadFailed: (id, callback) => {
		const subscription = (_event, data) => callback(data);
		electron.ipcRenderer.on(`download-failed-${id}`, subscription);
		return () => electron.ipcRenderer.removeListener(`download-failed-${id}`, subscription);
	}
});
//#endregion
