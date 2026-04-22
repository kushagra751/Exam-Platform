export const getRequestErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.request) {
    return `${fallbackMessage}. Please check that the server is running and try again.`;
  }

  return fallbackMessage;
};
