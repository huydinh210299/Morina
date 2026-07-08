const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { USER_ROLES } = require("../utils/constants");
const { generateToken } = require("../utils/auth");

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const shouldShowAttendanceReminder = (user) => {
  if (user.role !== USER_ROLES.STAFF) {
    return false;
  }

  const today = normalizeDate(new Date());
  const lastReminderDate = user.lastAttendanceReminderAt ? normalizeDate(user.lastAttendanceReminderAt) : null;

  if (lastReminderDate && lastReminderDate.getTime() === today.getTime()) {
    return false;
  }

  const hasTimekeepingToday = user.timekeeping.some((entry) => {
    if (!entry?.date) {
      return false;
    }

    return normalizeDate(entry.date).getTime() === today.getTime();
  });

  return !hasTimekeepingToday;
};

const getDefaultRouteForUser = (user) => {
  if (!user) {
    return "/auth/login";
  }

  return "/dashboard";
};

const getLoginData = (user) => {
  if (user) {
    return {
      redirectTo: getDefaultRouteForUser(user)
    };
  }

  return {
    title: "Đăng nhập"
  };
};

const loginUser = async ({ validatedBody }) => {
  const { username, password } = validatedBody;
  const user = await User.findOne({ username });

  if (!user) {
    return {
      errorMessage: "Tên đăng nhập hoặc mật khẩu không đúng.",
      redirectTo: "/auth/login"
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return {
      errorMessage: "Tên đăng nhập hoặc mật khẩu không đúng.",
      redirectTo: "/auth/login"
    };
  }

  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
    uuid: user.id
  });

  let successMessage = `Chào mừng quay lại, ${user.username}.`;

  if (shouldShowAttendanceReminder(user)) {
    successMessage += " Nhớ vào Chấm công để ghi nhận ca làm hôm nay.";
    await User.findByIdAndUpdate(user._id, {
      lastAttendanceReminderAt: new Date()
    });
  }

  return {
    token,
    cookieName: process.env.COOKIE_NAME || "rentalshop_token",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000
    },
    successMessage,
    redirectTo: getDefaultRouteForUser(user)
  };
};

const logoutUser = () => ({
  cookieName: process.env.COOKIE_NAME || "rentalshop_token",
  successMessage: "Bạn đã đăng xuất thành công.",
  redirectTo: "/auth/login"
});

module.exports = {
  getDefaultRouteForUser,
  getLoginData,
  loginUser,
  logoutUser
};
