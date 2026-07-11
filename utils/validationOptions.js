const vietnameseValidationMessages = {
  "any.required": "Vui lòng nhập đầy đủ thông tin bắt buộc",
  "any.only": "Giá trị đã chọn không hợp lệ",
  "string.base": "Giá trị đã nhập phải là chuỗi ký tự",
  "string.empty": "Vui lòng không để trống thông tin",
  "string.min": "Nội dung phải có ít nhất {#limit} ký tự",
  "string.pattern.base": "Định dạng đã nhập không hợp lệ",
  "number.base": "Giá trị đã nhập phải là một số",
  "number.min": "Giá trị đã nhập phải lớn hơn hoặc bằng {#limit}",
  "date.base": "Ngày đã nhập không hợp lệ",
  "date.min": "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  "boolean.base": "Giá trị đã nhập phải là đúng hoặc sai",
  "array.base": "Dữ liệu đã nhập phải là một danh sách",
  "object.unknown": "Thông tin đã nhập không được hỗ trợ"
};

const validationOptions = {
  abortEarly: false,
  convert: true,
  messages: vietnameseValidationMessages
};

module.exports = validationOptions;
