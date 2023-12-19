const getActiveTemplateForAction = (action_name, drafts, translations) => {    
    if (drafts && translations) {
      const draft = Object.values(drafts).find(
        (el) => el.is_activated == 1 && el.action_name == action_name
      )
      const translation = Object.values(translations).find(
        (el) => el.id == draft.default_translation_id
      )
      
      return { context: draft.context, translation: JSON.parse(translation.data) }
    } else return {}
}

module.exports = getActiveTemplateForAction