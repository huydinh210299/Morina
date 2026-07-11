const Order = require("../models/Order");

const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getTodayTomorrowFilter = () => {
  const todayRange = getDayRange(new Date());
  const tomorrow = new Date(todayRange.start);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowRange = getDayRange(tomorrow);

  return {
    $or: [
      {
        generalStartTime: {
          $gte: todayRange.start,
          $lte: todayRange.end
        }
      },
      {
        generalStartTime: {
          $gte: tomorrowRange.start,
          $lte: tomorrowRange.end
        }
      }
    ]
  };
};

const getDashboardData = async (user) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRange = getDayRange(today);
  const tomorrowRange = getDayRange(tomorrow);
  const todayTomorrowFilter = getTodayTomorrowFilter();

  const [todayOrders, tomorrowOrders, importantOrders, bookshipOrders] = await Promise.all([
    Order.countDocuments({
      generalStartTime: {
        $gte: todayRange.start,
        $lte: todayRange.end
      }
    }),
    Order.countDocuments({
      generalStartTime: {
        $gte: tomorrowRange.start,
        $lte: tomorrowRange.end
      }
    }),
    Order.countDocuments({
      ...todayTomorrowFilter,
      important: true,
      $nor: [
        {
          returned: true,
          returnDeposit: true
        }
      ]
    }),
    Order.countDocuments({
      ...todayTomorrowFilter,
      bookship: true,
      alreadyPickup: false
    })
  ]);

  return {
    title: "Tổng quan",
    currentUser: user,
    stats: {
      todayOrders,
      tomorrowOrders,
      importantOrders,
      bookshipOrders
    }
  };
};

module.exports = {
  getDashboardData
};
