export const ROLE_HOME = { student: '/app', admin: '/admin', super: '/platform' }
export const homeFor = (role) => ROLE_HOME[role] || '/login'
export const displayName = (user) => user?.name || user?.email || 'there'
export const firstName = (user) => (user?.name ? user.name.split(' ')[0] : '')
