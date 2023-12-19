const allRoles = {
  user: [''],
  admin: ['getUsers', 'manageUsers', 'loadAgenda', 'loadStaff', 'loadMembers'],
  superadmin: ['getUsers', 'manageUsers', 'loadAgenda', 'loadStaff', 'loadMembers', 'generateDecisions'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
