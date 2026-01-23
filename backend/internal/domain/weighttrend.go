package domain

import "time"

type WeightSample struct {
	Date     string
	WeightKg float64
}

type WeightTrend struct {
	WeeklyChangeKg float64
	RSquared       float64
	StartWeightKg  float64
	EndWeightKg    float64
}

type regressionPoint struct {
	x float64
	y float64
}

type regressionResult struct {
	slope     float64
	intercept float64
	rSquared  float64
}

func (r regressionResult) predict(x float64) float64 {
	return r.slope*x + r.intercept
}

func calculateLinearRegression(points []regressionPoint) regressionResult {
	n := float64(len(points))
	if n == 0 {
		return regressionResult{}
	}

	var sumX, sumY, sumXY, sumX2 float64
	for _, p := range points {
		sumX += p.x
		sumY += p.y
		sumXY += p.x * p.y
		sumX2 += p.x * p.x
	}

	denom := n*sumX2 - sumX*sumX
	if denom == 0 {
		meanY := sumY / n
		return regressionResult{intercept: meanY}
	}

	slope := (n*sumXY - sumX*sumY) / denom
	intercept := (sumY - slope*sumX) / n

	meanY := sumY / n
	var ssTot, ssRes float64
	for _, p := range points {
		predicted := slope*p.x + intercept
		diff := p.y - meanY
		ssTot += diff * diff
		residual := p.y - predicted
		ssRes += residual * residual
	}

	rSquared := 0.0
	if ssTot > 0 {
		rSquared = 1 - (ssRes / ssTot)
	}

	return regressionResult{
		slope:     slope,
		intercept: intercept,
		rSquared:  rSquared,
	}
}

// CalculateWeightTrend returns the regression trend for ordered samples.
// Returns nil if there are fewer than 2 samples.
func CalculateWeightTrend(samples []WeightSample) *WeightTrend {
	if len(samples) < 2 {
		return nil
	}

	startDate, err := time.Parse("2006-01-02", samples[0].Date)
	if err != nil {
		return calculateWeightTrendByIndex(samples)
	}

	points := make([]regressionPoint, len(samples))
	for i, sample := range samples {
		sampleDate, err := time.Parse("2006-01-02", sample.Date)
		if err != nil {
			return calculateWeightTrendByIndex(samples)
		}
		daysSinceStart := sampleDate.Sub(startDate).Hours() / 24
		points[i] = regressionPoint{
			x: daysSinceStart,
			y: sample.WeightKg,
		}
	}

	regression := calculateLinearRegression(points)
	lastX := points[len(points)-1].x

	return &WeightTrend{
		WeeklyChangeKg: regression.slope * 7,
		RSquared:       regression.rSquared,
		StartWeightKg:  regression.predict(0),
		EndWeightKg:    regression.predict(lastX),
	}
}

func calculateWeightTrendByIndex(samples []WeightSample) *WeightTrend {
	points := make([]regressionPoint, len(samples))
	for i, sample := range samples {
		points[i] = regressionPoint{
			x: float64(i),
			y: sample.WeightKg,
		}
	}

	regression := calculateLinearRegression(points)
	lastIndex := float64(len(samples) - 1)

	return &WeightTrend{
		WeeklyChangeKg: regression.slope * 7,
		RSquared:       regression.rSquared,
		StartWeightKg:  regression.predict(0),
		EndWeightKg:    regression.predict(lastIndex),
	}
}
