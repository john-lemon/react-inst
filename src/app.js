import React from 'react'
import ReactDOM from 'react-dom'
import Index from './Index'

ReactDOM.render(
  <div>
    <Index user='rm_dm' picsPerPage={6} />
    <Index location='275099403' picsPerPage={6} />
    <Index tag='kitty' picsPerPage={6} />
  </div>, document.getElementById('app')
)
