const { Worker } = require('worker_threads');
const path = require('path');

async function runWorkers() {
    const totalWorkers = 6;
    const workers = [];

    const workerPath = path.resolve(__dirname, 'workerAggregate.js');

    for (let workerId = 0; workerId < totalWorkers; workerId++) {
        const worker = new Worker(workerPath, {
            workerData: { workerId, totalWorkers }
        });

        worker.on('message', msg => console.log(msg));
        worker.on('error', err => console.error(`Worker ${workerId} error:`, err));
        worker.on('exit', code => {
            if (code !== 0) {
                console.error(`Worker ${workerId} exited with code ${code}`);
            }
        });

        workers.push(worker);
    }

    await Promise.all(workers.map(w => new Promise(resolve => w.on('exit', resolve))));
    console.log('All workers finished.');
}

runWorkers()
    .then(() => console.log('Parallel aggregation completed successfully!'))
    .catch(err => console.error('Parallel aggregation failed:', err));