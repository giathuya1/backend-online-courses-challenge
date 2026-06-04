var DataTypes = require("sequelize").DataTypes;
var _classes = require("./classes");
var _courses = require("./courses");
var _enrollments = require("./enrollments");
var _roles = require("./roles");
var _user_auth = require("./user_auth");
var _user_roles = require("./user_roles");
var _users = require("./users");

function initModels(sequelize) {
  var classes = _classes(sequelize, DataTypes);
  var courses = _courses(sequelize, DataTypes);
  var enrollments = _enrollments(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var user_auth = _user_auth(sequelize, DataTypes);
  var user_roles = _user_roles(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  roles.belongsToMany(users, { as: 'user_id_users', through: user_roles, foreignKey: "role_id", otherKey: "user_id" });
  users.belongsToMany(roles, { as: 'role_id_roles', through: user_roles, foreignKey: "user_id", otherKey: "role_id" });
  enrollments.belongsTo(classes, { as: "class", foreignKey: "class_id"});
  classes.hasMany(enrollments, { as: "enrollments", foreignKey: "class_id"});
  classes.belongsTo(courses, { as: "course", foreignKey: "course_id"});
  courses.hasMany(classes, { as: "classes", foreignKey: "course_id"});
  user_roles.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(user_roles, { as: "user_roles", foreignKey: "role_id"});
  classes.belongsTo(users, { as: "instructor", foreignKey: "instructor_id"});
  users.hasMany(classes, { as: "classes", foreignKey: "instructor_id"});
  courses.belongsTo(users, { as: "instructor", foreignKey: "instructor_id"});
  users.hasMany(courses, { as: "courses", foreignKey: "instructor_id"});
  enrollments.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(enrollments, { as: "enrollments", foreignKey: "user_id"});
  user_auth.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasOne(user_auth, { as: "user_auth", foreignKey: "user_id"});
  user_roles.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_roles, { as: "user_roles", foreignKey: "user_id"});

  return {
    classes,
    courses,
    enrollments,
    roles,
    user_auth,
    user_roles,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
