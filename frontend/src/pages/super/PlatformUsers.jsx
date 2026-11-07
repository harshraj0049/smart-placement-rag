import { Avatar } from '../../components/ui'

const USERS = [
  ['Platform Admin', 'root@placemate.ai', 'Super admin', 'All colleges'], ['Kavita Singh', 'tnp@kiit.ac.in', 'College admin', 'KIIT University'],
  ['Rahul Mishra', 'rahul.m@kiit.ac.in', 'College admin', 'KIIT University'], ['Meera Das', 'meera.d@kiit.ac.in', 'College admin', 'KIIT University'],
]
export default function PlatformUsers() {
  return (
    <>
      <div className="page-head"><div><h1>Platform users</h1><p>Super admins and college admins. Students are managed by their own college.</p></div></div>
      <div className="card"><div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>College</th></tr></thead>
        <tbody>{USERS.map(([n, e, r, c]) => <tr key={e}><td><div className="row"><Avatar name={n} size={32} /><b>{n}</b></div></td><td>{e}</td><td><span className={`badge ${r === 'Super admin' ? 'violet' : ''}`}>{r}</span></td><td>{c}</td></tr>)}</tbody>
      </table></div></div>
    </>
  )
}
