// @flow
import React, { Component } from 'react';
import { has, get, merge, omit, isEmpty } from 'lodash';

import {
  DEFAULT_PREFIX,
  isDisabled,
  getOrdinal,
  hasOrdinal,
  getComponent,
  hasComponent,
  getStyle,
  hasStyle
} from './selectors';

const LABEL_PROP = 'title';

function _compare(obj: { [name: string]: any }, prefix: string) {
  return (a, b) => {
    if (hasOrdinal(obj[a], prefix)) {
      if (hasOrdinal(obj[b], prefix)) {
        const aOrdinal = getOrdinal(obj[a], prefix);
        const bOrdinal = getOrdinal(obj[b], prefix);
        return aOrdinal - bOrdinal;
      }
      return 1;
    }
    if (hasOrdinal(obj[b], prefix)) {
      return -1;
    }

    const vA = get(obj[a], LABEL_PROP, a);
    const vB = get(obj[b], LABEL_PROP, b);
    return +(vA > vB) || +(vA === vB) - 1;
  };
}

function isRequired(schema: SchemaType, key: string) {
  return schema.required && schema.required.includes(key);
}

export default class SchemaVis extends Component {
  static defaultProps = {
    styles: {},
    prefix: DEFAULT_PREFIX,
    tag: 'div',
    id: 'schemaVis'
  };

  props: {
    schema: SchemaType,
    id: string,
    prefix: string,
    namespace?: string,
    styles: SchemaVisStylesType,
    components: { [string]: React.Element<*> | string },
    defaultComponents: { [string]: React.Element<*> | string },
    componentProps: { [string]: { styles: { [string]: any } } },
    tag: string
  };

  renderChildren = (schema: SchemaType, namespace?: string) => {
    const { prefix } = this.props;
    const children = schema.type === 'object' && schema.properties
      ? schema.properties
      : {};
    return Object.keys(children)
      .filter(prop => !isDisabled(children[prop], prefix))
      .sort(_compare(children, prefix))
      .map((prop, idx) =>
        this.renderSchema(
          children[prop],
          idx,
          namespace ? `${namespace}.${prop}` : prop,
          isRequired(schema, prop)
        )
      );
  };

  renderSchema = (
    schema: SchemaType,
    idx: number | string,
    name?: string,
    required: boolean = false
  ) => {
    const {
      styles: { component: componentStyles = {} },
      components,
      componentProps,
      prefix,
      tag: Tag,
      defaultComponents
    } = this.props;

    const schemaStyle = getStyle(schema, prefix, {});
    const component = getComponent(schema, prefix);
    const rest = omit(this.props, [
      'schema',
      'prefix',
      'styles',
      'namespace',
      'components',
      'componentProps',
      'defaultComponents',
      'tag'
    ]);

    if (
      (hasComponent(schema, prefix) && has(components, component)) ||
      has(defaultComponents, schema.type)
    ) {
      const ComponentVis = get(
        components,
        component,
        get(defaultComponents, schema.type)
      );
      const { styles: componentPropStyles = {}, ...componentProp } = get(
        componentProps,
        component,
        {}
      );

      const componentAttributes = {
        styles: merge({}, componentStyles, componentPropStyles, schemaStyle),
        key: idx,
        name,
        required,
        schemaVis: {
          prefix,
          schema,
          components,
          componentProps,
          defaultComponents,
          meta: {
            isDisabled: (schema: any) => isDisabled(schema, prefix),
            getOrdinal: (schema: any) => getOrdinal(schema, prefix),
            hasOrdinal: (schema: any) => hasOrdinal(schema, prefix),
            getComponent: (schema: any) => getOrdinal(schema, prefix),
            hasComponent: (schema: any) => hasComponent(schema, prefix),
            getStyle: (schema: any) => getStyle(schema, prefix),
            hasStyle: (schema: any) => hasStyle(schema, prefix)
          }
        },
        ...componentProp,
        ...rest
      };

      if (React.isValidElement(ComponentVis)) {
        return React.cloneElement(ComponentVis, componentAttributes);
      }

      return React.createElement(ComponentVis, componentAttributes);
    } else if (!isEmpty(get(schema, 'properties', []))) {
      return React.createElement(
        Tag,
        { key: idx, ...rest },
        this.renderChildren(schema, name)
      );
    }

    return undefined;
  };

  render() {
    const { schema, namespace, id } = this.props;

    return this.renderSchema(schema, id, namespace) || <div />;
  }
}
