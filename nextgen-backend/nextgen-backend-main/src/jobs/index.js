const { initCronJobs } = require("./cronScheduler");

module.exports.initAllJobs = () => {
  initCronJobs();
};
