const SUCCESS = (res, data,msg) => {
	return res.status(200).json({
		status: true,
		data: data,
		message: msg,
		statusCode: 200
	});
};

const ERROR = (res,statusCode,msg) => {
    msg = (msg) ? msg : 'Internal Server Error.'; 
	return res.status(statusCode).json({
		status: false,
		data: null,
		message: msg,
		statusCode: statusCode
	});
};

module.exports = {
	SUCCESS,
    ERROR
};
