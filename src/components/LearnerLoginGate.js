import React from "react";
import { Button, Card, CardContent, Grid, TextField } from "@material-ui/core";

class LearnerLoginGate extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            learnerID: "",
            error: "",
        };
    }

    onSubmit = (event) => {
        event.preventDefault();
        const learnerID = String(this.state.learnerID || "").trim();
        if (learnerID.length < 3) {
            this.setState({
                error: "Please enter a learner ID with at least 3 characters.",
            });
            return;
        }

        this.setState({ error: "" });
        this.props.onLogin(learnerID);
    };

    render() {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #f0f9ff 0%, #fffbeb 100%)",
                    padding: 16,
                }}
            >
                <Card style={{ width: "100%", maxWidth: 560 }}>
                    <CardContent>
                        <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                            Learner Login
                        </h2>
                        <p style={{ marginTop: 0, marginBottom: 16, color: "#475569" }}>
                            Enter your learner ID to start theory-first adaptive assessment.
                        </p>
                        <form onSubmit={this.onSubmit}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Learner ID"
                                        fullWidth
                                        variant="outlined"
                                        value={this.state.learnerID}
                                        onChange={(event) =>
                                            this.setState({ learnerID: event.target.value })
                                        }
                                        inputProps={{
                                            "aria-label": "Learner ID",
                                            autoComplete: "off",
                                        }}
                                    />
                                </Grid>
                                {this.state.error ? (
                                    <Grid item xs={12}>
                                        <div style={{ color: "#b91c1c", fontSize: 14 }}>
                                            {this.state.error}
                                        </div>
                                    </Grid>
                                ) : null}
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                    >
                                        Continue
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }
}

export default LearnerLoginGate;
