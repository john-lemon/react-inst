import React from 'react'
import { get, template } from 'lodash'
import axios from 'axios'

class Index extends React.Component {

  constructor (props) {
    super(props)
    this.renderTitle = this.renderTitle.bind(this)
    this.renderPics = this.renderPics.bind(this)
    this.prevPage = this.prevPage.bind(this)
    this.nextPage = this.nextPage.bind(this)
    this.getUserId = this.getUserId.bind(this)
    this.getLocationName = this.getLocationName.bind(this)
    this.getPics = this.getPics.bind(this)
    this.getAdditionalData = this.getAdditionalData.bind(this)

    if (this.props.user) {
      this.type = 'user'
    } else if (this.props.tag) {
      this.type = 'tag'
    } else if (this.props.location) {
      this.type = 'location'
    } else {
      throw Error('No user, tag or location')
    }

    this.state = {
      endCursor: '',
      pics: [],
      renderedPics: [],
      page: 1
    }

    this.picsPerPage = this.props.picsPerPage || 9

    /*
      Инстаграм очень урезал апи для неавторизованных приложений, поэтому https://www.instagram.com/developer/
      нам не поможет. Благо qraphql-апи торчит наружу, чем мы и воспользуемся.
      В словре будет урл для запроса и пути до необходимых данных.
    */

    this.typesDict = {
      user: {
        id: '',
        name: this.props.user || '',
        titleTemplate: 'Instagram photos by <%=name%>',
        pics: 'data.data.user.edge_owner_to_timeline_media.edges',
        next: 'data.data.user.edge_owner_to_timeline_media.page_info.end_cursor',
        queryUrlTemplate: 'https://instagram.com/graphql/query/?query_id=17888483320059182&id=<%=id%>&first=<%=picsPerPage%>'
      },
      location: {
        id: this.props.location || '',
        name: '',
        titleTemplate: 'Instagram photos from <%=name%>',
        pics: 'data.data.location.edge_location_to_media.edges',
        next: 'data.data.location.edge_location_to_media.page_info.end_cursor',
        queryUrlTemplate: 'https://instagram.com/graphql/query/?query_id=17865274345132052&id=<%=id%>&first=<%=picsPerPage%>'
      },
      tag: {
        id: this.props.tag || '',
        name: this.props.tag || '',
        titleTemplate: 'Instagram photos by #<%=name%>',
        pics: 'data.data.hashtag.edge_hashtag_to_media.edges',
        next: 'data.data.hashtag.edge_hashtag_to_media.page_info.end_cursor',
        queryUrlTemplate: 'https://instagram.com/graphql/query/?query_id=17875800862117404&tag_name=<%=id%>&first=<%=picsPerPage%>'
      }
    }
  }

  componentWillMount () {
    const { picsPerPage } = this
    this.getAdditionalData().then((id) => {
      this.getPics(id).then(() => {
        this.state.renderedPics = this.state.pics.slice(0, picsPerPage)
        this.setState({})
        return true
      })
    })
  }

  /*
    Данные о пользователе мы берем по его id, который сперва надо узнать,
    а для локации наоборот надо подтянуть ее название для отображения в хэдере,
    поэтому сперва подцепим эти данные, а уже потом пойдем за изображениями
  */
  getAdditionalData () {
    return new Promise((resolve, reject) => {
      if (this.type === 'user') {
        this.getUserId().then((userId) => {
          return resolve(userId)
        })
      } else if (this.type === 'location') {
        this.getLocationName().then((locationId) => {
          return resolve(locationId)
        })
      } else {
        return resolve(this.props.tag)
      }
    })
  }

  getUserId () {
    return axios.get(`https://www.instagram.com/${this.props.user}/?__a=1`).then((response) => {
      this.typesDict[this.type].id = response.data.graphql.user.id
      this.typesDict[this.type].name = this.props.user
      return response.data.graphql.user.id
    })
  }

  getLocationName () {
    return axios.get(`https://www.instagram.com/explore/locations/${this.props.location}/?__a=1`).then((response) => {
      this.typesDict[this.type].name = response.data.location.name
      return response.data.location.id
    })
  }

  getPics (id, endCursor) {
    if (!id) { throw Error('No user, tag, or location') }
    const { type, picsPerPage } = this
    const dict = this.typesDict[type]
    let queryUrl = template(dict.queryUrlTemplate)({'id': id, 'picsPerPage': picsPerPage})
    if (endCursor) {
      queryUrl += `&after=${endCursor}`
    }
    return axios.get(queryUrl).then((response) => {
      this.state.pics = this.state.pics.concat(get(response, dict.pics, []))
      this.state.endCursor = get(response, dict.next, '')
      return true
    })
  }

  nextPage () {
    const { page } = this.state
    const { picsPerPage } = this
    const firstIndex = picsPerPage * page
    const lastIndex = picsPerPage * (page + 1)
    const setPicsToRender = () => {
      this.state.renderedPics = this.state.pics.slice(firstIndex, lastIndex)
      this.state.page += 1
      this.setState({})
    }

    if (this.state.pics.length < (page + 1) * picsPerPage) {
      const id = this.typesDict[this.type].id
      this.getPics(id, this.state.endCursor).then(() => {
        setPicsToRender()
      })
    } else {
      setPicsToRender()
    }
  }

  prevPage () {
    if (this.state.page !== 1) {
      const { page } = this.state
      const { picsPerPage } = this
      const firstIndex = picsPerPage * (page - 2)
      const lastIndex = picsPerPage * (page - 1)
      this.state.renderedPics = this.state.pics.slice(firstIndex, lastIndex)
      this.state.page -= 1
      this.setState({})
    }
  }

  render () {
    const wrapperStyle = {
      margin: '0 auto',
      width: '480px'
    }
    const listStyle = {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    }
    const buttonStyle = {
      height: '30px',
      fontSize: '14px',
      width: '70px',
      border: '1px  solid #dbdbdb',
      borderRadius: '3px',
      background: '#fff'
    }
    const buttonDisabledStyle = Object.assign({opacity: '0.5'}, buttonStyle)
    const buttonsWrapperStyle = {
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between'
    }
    return <div style={wrapperStyle}>
      { this.renderTitle() }
      <div style={listStyle}>
        { this.state.renderedPics && this.renderPics(this.state.renderedPics)}
      </div>
      <div style={buttonsWrapperStyle}>
        <button style={this.state.page !== 1 ? buttonStyle : buttonDisabledStyle} onClick={this.prevPage}>Previous</button>
        <button style={buttonStyle} onClick={this.nextPage}>Next</button>
      </div>
    </div>
  }

  renderTitle () {
    const hederStyle = {
      textAlign: 'center',
      fontFamily: 'Verdana, Geneva, sans-serif',
      fontWeight: 300
    }
    return <h1 style={hederStyle}>{ template(this.typesDict[this.type].titleTemplate)({ 'name': this.typesDict[this.type].name }) }</h1>
  }

  renderPics (pics) {
    const itemStyle = {
      position: 'relative',
      padding: '20px'
    }
    const imageStyle = {
      width: '120px'
    }
    let result = []
    pics.forEach(pic => {
      result.push(
        <div style={itemStyle} key={pic.node.id}>
          <img src={pic.node.thumbnail_resources[1].src} style={imageStyle} />
        </div>)
    })
    return result
  }
}

export default Index
