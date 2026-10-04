export function createUserService() {
  const users = new Map([['u-1', { name: 'zy', role: 'admin' }]])

  class UserService {
    list() {
      console.log('用户列表', [...users.values()])
      return [...users.values()]
    }

    find(id) {
      const user = users.get(id)
      if (!user) {
        console.warn('用户不存在：', id)
        return null
      }
      console.debug('命中用户', user)
      return user
    }
  }

  const instance = new UserService()

  const reportError = (error) => {
    console.error('服务异常：', error)
  }

  instance.list()
  instance.find('u-404')
  reportError(new Error('demo failure'))

  return {
    stats: () => ({ size: users.size, ok: true }),
  }
}
