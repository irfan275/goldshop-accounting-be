const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { UserRoles } = require("../constants/user.constant");
const { ERROR } = require("../helper/response.helper");

exports.checkUserHasRole = (roles,UserRole) => {
    try {
        // Check if user exists and has the super admin role
        if (roles && roles.includes(UserRole)) 
            return true;
        return false;
    } catch (error) {
        console.error('Error checking user role:', error.message);
        return false;
    }
}

exports.checkUserPrivileges = async (res,userRoles,...rolesToCheck) => {
    try {
        // Iterate through the user's roles
        for (let userRole of userRoles) {
            // Check if the user has any role from the given array
            if (rolesToCheck.includes(userRole)) {
                // User has a role from the given array
                return true;
            }
        }

        // User does not have any role from the given array
        return  ERROR(res,StatusCode.FORBIDDEN,Messages.INVALID_ACCESS);
    } catch (error) {
        console.error('Error checking user role:', error.message);
        return  ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
}