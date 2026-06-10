    id="email"
              name="email"
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">
              <LockKeyhole className="icon" aria-hidden="true" />
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {message ? <p className="form-message error">{message}</p> : null}
          <div className="actions">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="icon spin" aria-hidden="true" />
                  로그인 중
                <