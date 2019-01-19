import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Redirect, withRouter } from 'react-router-dom';
import getDisplayName from 'react-display-name';
import queryString from './utils/queryParams';

import { isEqual } from 'lodash';

const assert = (condition, message = 'Assertion failed') => {
  if (!condition) {
    if (typeof Error !== 'undefined') {
      throw new Error(message);
    }

    throw message; // fallback if Error not supported
  }
};

export default function withQueryParams({
  keys,
  stripUnknownKeys = false,
  queryStringOptions
} = {}) {
  if (keys && stripUnknownKeys) {
    assert(
      Object.keys(keys).length > 0,
      'at least one query param key must be configured'
    );
  }

  if (keys) {
    Object.keys(keys).forEach(key => {
      assert(keys[key].validate, `Missing validate function for key ${key}`);
      assert(
        typeof keys[key].validate === 'function',
        `'validate' for ${key} must be a function`
      );
    });
  }

  return Wrapped => {
    class WithQueryParams extends Component {
      static displayName = `withQueryParams(${getDisplayName(Wrapped)})`;

      static propTypes = {
        location: PropTypes.shape({
          search: PropTypes.string,
          pathname: PropTypes.string
        }).isRequired,
        history: PropTypes.shape({
          push: PropTypes.func.isRequired,
          createHref: PropTypes.func.isRequired
        }).isRequired
      };

      setQueryParams = obj => {
        const { history } = this.props;
        const pathname = window.location.pathname;
        const search = window.location.search;

        const parseCurrentQPs = queryString.parse(search);

        const to = history.createHref({
          pathname,
          search: queryString.stringify({
            ...parseCurrentQPs,
            ...obj
          })
        });

        history.push(to);
      };

      shouldComponentUpdate(nextProps, nextState) {
        return (
          !isEqual(this.props, nextProps) ||
          nextProps.location.search !== window.location.search
        );
      }

      render() {
        const location = window.location;
        const queryParams = queryString.parse(location.search);

        const newQueryParams = keys
          ? Object.keys(keys).reduce((acc, paramName) => {
              const defaultConf = keys[paramName].default;
              const defaultValue =
                typeof defaultConf === 'function'
                  ? defaultConf(queryParams[paramName], this.props)
                  : defaultConf;

              return {
                ...acc,
                [paramName]: keys[paramName].validate(
                  queryParams[paramName],
                  this.props
                )
                  ? queryParams[paramName]
                  : defaultValue
              };
            }, {})
          : queryParams;

        const allParams = stripUnknownKeys
          ? newQueryParams
          : {
              ...queryParams,
              ...newQueryParams
            };

        const searchString = queryString.stringify(allParams);

        if (location.search.replace('?', '') !== searchString) {
          return (
            <Redirect
              to={{ pathname: location.pathname, search: searchString }}
            />
          );
        }

        const wrappedProps = {
          location,
          setQueryParams: this.setQueryParams,
          queryParams: allParams
        };

        return <Wrapped {...this.props} {...wrappedProps} />;
      }
    }

    return withRouter(WithQueryParams);
  };
}
