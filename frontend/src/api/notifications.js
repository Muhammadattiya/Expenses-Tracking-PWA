import API from "./axios";

export const subscribeToNotifications = async (subscription) => {
  const { data } = await API.post("/notifications/subscribe", subscription);
  return data;
};

export const sendNotification = async (payload) => {
  const { data } = await API.post("/notifications/send", payload);
  return data;
};
